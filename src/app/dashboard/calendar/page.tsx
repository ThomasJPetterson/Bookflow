'use client'
// ============================================================
// Calendar Page — Week view with staff filter
// ============================================================
import { useState, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks,
  eachDayOfInterval, format, isSameDay, parseISO, addMinutes
} from 'date-fns'

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [bookings, setBookings]   = useState<any[]>([])
  const [staff, setStaff]         = useState<any[]>([])
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [loading, setLoading]     = useState(true)

  const weekDays = eachDayOfInterval({
    start: weekStart,
    end:   endOfWeek(weekStart, { weekStartsOn: 1 }),
  })
  const hours = Array.from({ length: 14 }, (_, i) => i + 7)  // 7am - 9pm

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/staff').then(r => r.json()),
    ]).then(([staffData]) => {
      setStaff(staffData.staff ?? [])
    })
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [weekStart, staffFilter])

  async function fetchBookings() {
    setLoading(true)
    const from = weekStart.toISOString()
    const to   = endOfWeek(weekStart, { weekStartsOn: 1 }).toISOString()
    let url    = `/api/bookings?from=${from}&to=${to}`
    if (staffFilter !== 'all') url += `&staff_id=${staffFilter}`
    const res = await fetch(url)
    const { bookings } = await res.json()
    setBookings(bookings ?? [])
    setLoading(false)
  }

  // Position booking in grid (px from top of hour row)
  function getBookingStyle(booking: any) {
    const start   = parseISO(booking.starts_at)
    const end     = parseISO(booking.ends_at)
    const startMins = start.getHours() * 60 + start.getMinutes()
    const endMins   = end.getHours() * 60 + end.getMinutes()
    const top       = (startMins - 7 * 60) * (56 / 60)   // 56px per hour
    const height    = Math.max((endMins - startMins) * (56 / 60), 20)
    return { top, height }
  }

  const STATUS_COLORS: Record<string, string> = {
    confirmed: '#6366f1',
    completed: '#10b981',
    cancelled: '#9ca3af',
    no_show:   '#f59e0b',
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
        <div className="controls">
          {/* Staff filter */}
          <select
            className="staff-select"
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
          >
            <option value="all">All Staff</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Week navigation */}
          <div className="week-nav">
            <button onClick={() => setWeekStart(w => subWeeks(w, 1))}>←</button>
            <span className="week-label">
              {format(weekStart, 'd MMM')} — {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'd MMM yyyy')}
            </span>
            <button onClick={() => setWeekStart(w => addWeeks(w, 1))}>→</button>
          </div>

          <button className="today-btn" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </button>
        </div>
      </div>

      <div className="calendar-wrapper">
        {/* Day headers */}
        <div className="cal-grid">
          <div className="time-col" />
          {weekDays.map(day => (
            <div
              key={day.toISOString()}
              className={`day-header ${isSameDay(day, new Date()) ? 'today' : ''}`}
            >
              <div className="day-name">{format(day, 'EEE')}</div>
              <div className="day-num">{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="cal-body">
          <div className="cal-grid">
            {/* Time labels */}
            <div className="time-col">
              {hours.map(h => (
                <div key={h} className="hour-label">{h}:00</div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(day => (
              <div
                key={day.toISOString()}
                className={`day-col ${isSameDay(day, new Date()) ? 'today-col' : ''}`}
              >
                {/* Hour lines */}
                {hours.map(h => (
                  <div key={h} className="hour-row" />
                ))}

                {/* Bookings */}
                {bookings
                  .filter(b => isSameDay(parseISO(b.starts_at), day) && b.status !== 'cancelled')
                  .map(b => {
                    const { top, height } = getBookingStyle(b)
                    const color = STATUS_COLORS[b.status] ?? '#6366f1'
                    return (
                      <div
                        key={b.id}
                        className="booking-block"
                        style={{
                          top:        `${top}px`,
                          height:     `${height}px`,
                          background: color + '22',
                          borderColor: color,
                        }}
                        title={`${b.client_name} · ${b.service?.name} · ${b.staff?.name}`}
                      >
                        <div className="block-title" style={{ color }}>
                          {format(parseISO(b.starts_at), 'HH:mm')} {b.service?.name}
                        </div>
                        {height > 36 && (
                          <div className="block-client">{b.client_name}</div>
                        )}
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .page-title { font-size: 24px; font-weight: 800; color: #111; margin: 0; }
        .controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .staff-select { padding: 7px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; background: white; }
        .week-nav { display: flex; align-items: center; gap: 8px; }
        .week-nav button { background: white; border: 1px solid #e5e7eb; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 16px; }
        .week-label { font-size: 14px; font-weight: 600; color: #374151; min-width: 180px; text-align: center; }
        .today-btn { padding: 7px 14px; background: #111; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }

        .calendar-wrapper { background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.06); }

        .cal-grid { display: grid; grid-template-columns: 56px repeat(7, 1fr); }

        /* Day headers */
        .time-col { border-right: 1px solid #f3f4f6; }
        .day-header {
          padding: 12px 8px; text-align: center; border-bottom: 1px solid #e5e7eb;
          border-right: 1px solid #f3f4f6;
        }
        .day-header.today { background: #f5f3ff; }
        .day-name { font-size: 11px; text-transform: uppercase; color: #9ca3af; letter-spacing: .5px; }
        .day-num { font-size: 20px; font-weight: 700; color: #111; }
        .day-header.today .day-num { color: #6366f1; }

        /* Body */
        .cal-body { overflow-y: auto; max-height: 640px; }
        .cal-body .time-col {
          border-right: 1px solid #f3f4f6;
        }
        .hour-label {
          height: 56px; display: flex; align-items: flex-start; padding-top: 4px;
          justify-content: center; font-size: 11px; color: #9ca3af; border-bottom: 1px solid #f3f4f6;
        }
        .day-col {
          position: relative; border-right: 1px solid #f3f4f6;
        }
        .day-col.today-col { background: #fafaf8; }
        .hour-row { height: 56px; border-bottom: 1px solid #f3f4f6; }

        .booking-block {
          position: absolute; left: 2px; right: 2px;
          border-left: 3px solid; border-radius: 6px;
          padding: 3px 6px; overflow: hidden; cursor: pointer;
          transition: opacity .15s;
        }
        .booking-block:hover { opacity: .85; }
        .block-title { font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .block-client { font-size: 11px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </div>
  )
}
