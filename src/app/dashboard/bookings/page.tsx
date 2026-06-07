'use client'
// ============================================================
// Bookings Management Page
// ============================================================
import { useState, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { format } from 'date-fns'
import type { Booking } from '@/types'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<string>('all')

  useEffect(() => {
    fetchBookings()
  }, [filter])

  async function fetchBookings() {
    setLoading(true)
    const params = filter !== 'all' ? `?status=${filter}` : ''
    const res = await fetchWithAuth(`/api/bookings${params}`)
    const { bookings } = await res.json()
    setBookings(bookings ?? [])
    setLoading(false)
  }

  async function cancelBooking(id: string) {
    if (!confirm('Cancel this booking?')) return
    await fetchWithAuth(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    fetchBookings()
  }

  async function completeBooking(id: string) {
    await fetchWithAuth(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    fetchBookings()
  }

  const filters = [
    { value: 'all',       label: 'All' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bookings</h1>
        <span className="count">{bookings.length} bookings</span>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {filters.map(f => (
          <button
            key={f.value}
            className={`filter-btn ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading">Loading bookings…</div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">No bookings found.</div>
      ) : (
        <div className="table-wrapper">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Client</th>
                <th>Service</th>
                <th>Staff</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: any) => (
                <tr key={b.id}>
                  <td><code className="ref">{b.booking_ref}</code></td>
                  <td>
                    <div className="client-name">{b.client_name}</div>
                    <div className="client-contact">{b.client_email}</div>
                    {b.client_phone && <div className="client-contact">{b.client_phone}</div>}
                  </td>
                  <td>{b.service?.name ?? '—'}</td>
                  <td>{b.staff?.name ?? '—'}</td>
                  <td>
                    <div>{format(new Date(b.starts_at), 'd MMM yyyy')}</div>
                    <div className="time">{format(new Date(b.starts_at), 'HH:mm')}</div>
                  </td>
                  <td>
                    <span className={`status status-${b.status}`}>{b.status}</span>
                  </td>
                  <td>
                    <div className="actions">
                      {b.status === 'confirmed' && (
                        <>
                          <button className="action-btn complete" onClick={() => completeBooking(b.id)}>
                            Done
                          </button>
                          <button className="action-btn cancel" onClick={() => cancelBooking(b.id)}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .page-header {
          display: flex; align-items: center; gap: 16px; margin-bottom: 20px;
        }
        .page-title { font-size: 24px; font-weight: 800; color: #111; margin: 0; }
        .count { font-size: 14px; color: #9ca3af; }

        .filter-bar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .filter-btn {
          padding: 6px 16px; border-radius: 20px; border: 1px solid #e5e7eb;
          background: white; font-size: 14px; cursor: pointer; color: #6b7280; transition: all .15s;
        }
        .filter-btn.active { background: #111; color: white; border-color: #111; }
        .filter-btn:hover { border-color: #9ca3af; }

        .table-wrapper { background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
        .bookings-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .bookings-table th {
          background: #f9fafb; padding: 12px 16px; text-align: left;
          font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;
          letter-spacing: .5px; border-bottom: 1px solid #e5e7eb;
        }
        .bookings-table td {
          padding: 14px 16px; border-bottom: 1px solid #f3f4f6;
          vertical-align: top;
        }
        .bookings-table tr:last-child td { border-bottom: none; }
        .ref { font-family: monospace; font-size: 13px; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
        .client-name { font-weight: 600; color: #111; }
        .client-contact { color: #9ca3af; font-size: 12px; }
        .time { color: #9ca3af; font-size: 12px; }

        .status {
          display: inline-block; font-size: 12px; font-weight: 600;
          padding: 3px 10px; border-radius: 20px; text-transform: capitalize;
        }
        .status-confirmed { background: #dcfce7; color: #15803d; }
        .status-completed { background: #e0f2fe; color: #0369a1; }
        .status-cancelled { background: #fee2e2; color: #b91c1c; }
        .status-no_show   { background: #fef9c3; color: #854d0e; }

        .actions { display: flex; gap: 6px; }
        .action-btn {
          padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;
          border: none; cursor: pointer; transition: opacity .15s;
        }
        .action-btn:hover { opacity: .8; }
        .action-btn.complete { background: #dcfce7; color: #15803d; }
        .action-btn.cancel   { background: #fee2e2; color: #b91c1c; }

        .loading, .empty-state {
          background: white; border-radius: 14px; padding: 60px;
          text-align: center; color: #9ca3af; font-size: 15px;
        }
      `}</style>
    </div>
  )
}
