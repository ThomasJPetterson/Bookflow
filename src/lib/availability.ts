// ============================================================
// BOOKFLOW — Availability Engine
// Core logic for generating available time slots
// ============================================================
import { addMinutes, format, parseISO, startOfDay, isAfter, isBefore, setHours, setMinutes } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { AvailabilityRule, Booking, TimeSlot } from '@/types'

const SLOT_INTERVAL_MINS = 15  // granularity of slot grid

/**
 * Generate all available time slots for a staff member on a given date.
 *
 * Algorithm:
 * 1. Find availability rule for staff on that day of week
 * 2. Generate all possible slots within working hours
 * 3. Remove slots that overlap existing confirmed bookings
 * 4. Remove slots in the past
 */
export function generateAvailableSlots(
  date: string,                    // YYYY-MM-DD
  serviceDurationMins: number,
  availabilityRules: AvailabilityRule[],
  existingBookings: Booking[],
  timezone: string = 'Europe/London'
): TimeSlot[] {
  // Parse the date in the business timezone
  const localDate = toZonedTime(parseISO(date + 'T00:00:00'), timezone)
  const dayOfWeek = localDate.getDay()  // 0=Sun .. 6=Sat

  // Find the rule for this day
  const rule = availabilityRules.find(
    r => r.day_of_week === dayOfWeek && r.is_active
  )
  if (!rule) return []

  // Build start/end in local timezone
  const [startH, startM] = rule.start_time.split(':').map(Number)
  const [endH, endM]     = rule.end_time.split(':').map(Number)

  const dayStart = setMinutes(setHours(startOfDay(localDate), startH), startM)
  const dayEnd   = setMinutes(setHours(startOfDay(localDate), endH), endM)

  const now = toZonedTime(new Date(), timezone)

  const slots: TimeSlot[] = []
  let cursor = dayStart

  while (isBefore(addMinutes(cursor, serviceDurationMins), dayEnd) ||
         addMinutes(cursor, serviceDurationMins).getTime() === dayEnd.getTime()) {
    const slotEnd = addMinutes(cursor, serviceDurationMins)

    // Skip past slots (add 15min buffer)
    if (!isAfter(cursor, addMinutes(now, 15))) {
      cursor = addMinutes(cursor, SLOT_INTERVAL_MINS)
      continue
    }

    // Check against existing bookings
    const slotStartUTC = fromZonedTime(cursor, timezone)
    const slotEndUTC   = fromZonedTime(slotEnd, timezone)

    const hasConflict = existingBookings.some(booking => {
      if (booking.status === 'cancelled') return false
      const bookStart = parseISO(booking.starts_at)
      const bookEnd   = parseISO(booking.ends_at)
      // Overlap: slot starts before booking ends AND slot ends after booking starts
      return isBefore(slotStartUTC, bookEnd) && isAfter(slotEndUTC, bookStart)
    })

    slots.push({
      starts_at: slotStartUTC.toISOString(),
      ends_at:   slotEndUTC.toISOString(),
      label:     format(cursor, 'HH:mm'),
      available: !hasConflict,
    })

    cursor = addMinutes(cursor, SLOT_INTERVAL_MINS)
  }

  return slots
}

/**
 * Find the next available staff member for auto-assign.
 * Returns staff_id of whoever has the fewest bookings on that day.
 */
export function autoAssignStaff(
  staffIds: string[],
  bookingsByStaff: Record<string, Booking[]>
): string | null {
  if (staffIds.length === 0) return null
  return staffIds.sort((a, b) =>
    (bookingsByStaff[a]?.length ?? 0) - (bookingsByStaff[b]?.length ?? 0)
  )[0]
}

/**
 * Group slots by hour for display in the UI
 */
export function groupSlotsByHour(slots: TimeSlot[]): Record<string, TimeSlot[]> {
  return slots.reduce((acc, slot) => {
    const hour = slot.label.split(':')[0] + ':00'
    if (!acc[hour]) acc[hour] = []
    acc[hour].push(slot)
    return acc
  }, {} as Record<string, TimeSlot[]>)
}
