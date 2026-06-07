// ============================================================
// POST /api/bookings
// Creates a new booking (public endpoint, no auth required)
// Double-booking prevention via DB EXCLUDE constraint + re-check
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helper'
import { createAdminClient } from '@/lib/supabase-server'
import { sendBookingNotifications } from '@/lib/notifications'
import type { CreateBookingPayload } from '@/types'

export async function POST(req: NextRequest) {
  let body: CreateBookingPayload

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { business_id, service_id, staff_id, starts_at, ends_at,
          client_name, client_email, client_phone, client_notes } = body

  if (!business_id || !service_id || !staff_id || !starts_at || !ends_at ||
      !client_name || !client_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  // Use admin client for the insert — RLS allows public INSERT
  const supabase = createAdminClient()

  // Verify all IDs belong to the same business (security check)
  const [serviceCheck, staffCheck] = await Promise.all([
    supabase.from('services').select('id,name,duration_mins,price').eq('id', service_id).eq('business_id', business_id).single(),
    supabase.from('staff').select('id,name').eq('id', staff_id).eq('business_id', business_id).single(),
  ])

  if (serviceCheck.error || staffCheck.error) {
    return NextResponse.json({ error: 'Invalid service or staff for this business' }, { status: 400 })
  }

  // Validate booking duration matches service
  const expectedDuration = serviceCheck.data.duration_mins * 60 * 1000
  const actualDuration   = new Date(ends_at).getTime() - new Date(starts_at).getTime()
  if (Math.abs(expectedDuration - actualDuration) > 60000) {  // 1 min tolerance
    return NextResponse.json({ error: 'Booking duration does not match service' }, { status: 400 })
  }

  // Insert — the EXCLUDE constraint prevents double-booking at the DB level
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      business_id,
      service_id,
      staff_id,
      starts_at,
      ends_at,
      client_name: client_name.trim(),
      client_email: client_email.toLowerCase().trim(),
      client_phone: client_phone?.trim(),
      client_notes: client_notes?.trim(),
      status: 'confirmed',
    })
    .select()
    .single()

  if (error) {
    // PostgreSQL exclusion violation
    if (error.code === '23P01' || error.message?.includes('no_double_booking')) {
      return NextResponse.json(
        { error: 'This time slot is no longer available. Please choose another.' },
        { status: 409 }
      )
    }
    console.error('Booking insert error:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  // Fetch business for notifications
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', business_id)
    .single()

  // Send notifications (non-blocking)
  console.log('Notification attempt - business found:', !!business, 'RESEND_API_KEY set:', !!process.env.RESEND_API_KEY)
  if (business) {
    sendBookingNotifications({
      booking,
      business,
      service: serviceCheck.data as any,
      staff: staffCheck.data as any,
    }).then(() => {
      console.log('Notifications sent successfully')
    }).catch(err => {
      console.error('Notification error:', err)
    })
  } else {
    console.error('Business not found for notifications, business_id:', business_id)
  }

  return NextResponse.json({
    booking_ref: booking.booking_ref,
    starts_at:   booking.starts_at,
    ends_at:     booking.ends_at,
    service:     serviceCheck.data.name,
    staff:       staffCheck.data.name,
  }, { status: 201 })
}

// ============================================================
// GET /api/bookings — Dashboard: list bookings for auth'd business
// ============================================================
export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const from   = searchParams.get('from')
  const to     = searchParams.get('to')
  const staffId = searchParams.get('staff_id')

  let query = supabase
    .from('bookings')
    .select(`*, service:services(*), staff:staff(*)`)
    .eq('business_id', business.id)
    .order('starts_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (from)   query = query.gte('starts_at', from)
  if (to)     query = query.lte('starts_at', to)
  if (staffId) query = query.eq('staff_id', staffId)

  const { data: bookings, error } = await query.limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookings })
}
