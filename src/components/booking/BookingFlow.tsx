'use client'
// ============================================================
// BookingFlow — Multi-step booking wizard for public booking page
// Steps: service → staff → date → time → details → confirm
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { format, addDays, startOfToday, isToday, isTomorrow } from 'date-fns'
import type { BookingPageData, Service, Staff, TimeSlot } from '@/types'

type Step = 'service' | 'staff' | 'date' | 'time' | 'details' | 'confirmed'

interface BookingState {
  service:  Service | null
  staff:    Staff | null
  date:     Date | null
  slot:     TimeSlot | null
}

export function BookingFlow({ data }: { data: BookingPageData }) {
  const { business, services, staff } = data
  const accent = business.color_accent ?? '#6366f1'

  const [step, setStep]     = useState<Step>('service')
  const [booking, setBooking] = useState<BookingState>({
    service: null, staff: null, date: null, slot: null,
  })
  const [slots, setSlots]   = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [confirmRef, setConfirmRef] = useState<string | null>(null)

  // Client details form
  const [form, setForm] = useState({
    name: '', email: '', phone: '', notes: ''
  })

  // Eligible staff for selected service
  const eligibleStaff = booking.service
    ? staff.filter(s => s.services.includes(booking.service!.id))
    : []

  // Fetch time slots when date + staff + service are all set
  const fetchSlots = useCallback(async () => {
    if (!booking.date || !booking.staff || !booking.service) return
    setLoadingSlots(true)
    setError(null)
    try {
      const dateStr = format(booking.date, 'yyyy-MM-dd')
      const res = await fetch(
        `/api/availability?business_id=${business.id}&staff_id=${booking.staff.id}&service_id=${booking.service.id}&date=${dateStr}`
      )
      const { slots: fetched } = await res.json()
      setSlots(fetched ?? [])
    } catch {
      setError('Failed to load time slots')
    } finally {
      setLoadingSlots(false)
    }
  }, [booking.date, booking.staff, booking.service, business.id])

  useEffect(() => {
    if (step === 'time') fetchSlots()
  }, [step, fetchSlots])

  async function submitBooking() {
    if (!booking.service || !booking.staff || !booking.slot) return
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id:  business.id,
          service_id:   booking.service.id,
          staff_id:     booking.staff.id,
          starts_at:    booking.slot.starts_at,
          ends_at:      booking.slot.ends_at,
          client_name:  form.name.trim(),
          client_email: form.email.trim(),
          client_phone: form.phone.trim() || undefined,
          client_notes: form.notes.trim() || undefined,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      setConfirmRef(result.booking_ref)
      setStep('confirmed')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStep('service')
    setBooking({ service: null, staff: null, date: null, slot: null })
    setForm({ name: '', email: '', phone: '', notes: '' })
    setConfirmRef(null)
    setError(null)
  }

  // Generate next 30 days
  const dates = Array.from({ length: 30 }, (_, i) => addDays(startOfToday(), i))

  const stepLabels: Record<Step, string> = {
    service: 'Service', staff: 'Staff', date: 'Date',
    time: 'Time', details: 'Details', confirmed: 'Done'
  }
  const stepOrder: Step[] = ['service', 'staff', 'date', 'time', 'details', 'confirmed']
  const currentIdx = stepOrder.indexOf(step)

  return (
    <div className="booking-container">
      {/* Header */}
      <header className="booking-header" style={{ background: accent }}>
        <div className="booking-header-inner">
          {business.logo_url && (
            <img src={business.logo_url} alt={business.name} className="business-logo" />
          )}
          <div>
            <h1 className="business-name">{business.name}</h1>
            <p className="business-tagline">Online Booking</p>
          </div>
        </div>
      </header>

      {/* Progress */}
      {step !== 'confirmed' && (
        <div className="progress-bar">
          {stepOrder.slice(0, 5).map((s, i) => (
            <div
              key={s}
              className={`progress-step ${i < currentIdx ? 'done' : ''} ${i === currentIdx ? 'active' : ''}`}
              style={i <= currentIdx ? { '--step-color': accent } as any : {}}
            >
              <div className="step-dot">{i < currentIdx ? '✓' : i + 1}</div>
              <span className="step-label">{stepLabels[s]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="booking-content">
        {error && (
          <div className="error-banner">
            <span>⚠</span> {error}
          </div>
        )}

        {/* ── Step: Service ── */}
        {step === 'service' && (
          <StepSection title="Choose a service">
            <div className="service-grid">
              {services.map(svc => (
                <button
                  key={svc.id}
                  className={`service-card ${booking.service?.id === svc.id ? 'selected' : ''}`}
                  style={{ '--card-accent': svc.color } as any}
                  onClick={() => {
                    setBooking(b => ({ ...b, service: svc, staff: null, date: null, slot: null }))
                    setStep('staff')
                  }}
                >
                  <div className="service-dot" style={{ background: svc.color }} />
                  <div className="service-info">
                    <span className="service-name">{svc.name}</span>
                    <div className="service-meta">
                      <span>{svc.duration_mins} min</span>
                      {svc.price && <span>£{svc.price.toFixed(2)}</span>}
                    </div>
                    {svc.description && (
                      <p className="service-desc">{svc.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </StepSection>
        )}

        {/* ── Step: Staff ── */}
        {step === 'staff' && (
          <StepSection title="Choose your preferred staff" onBack={() => setStep('service')}>
            <div className="staff-grid">
              <button
                className={`staff-card any-staff ${!booking.staff ? 'selected' : ''}`}
                onClick={() => {
                  setBooking(b => ({ ...b, staff: eligibleStaff[0] ?? null, date: null, slot: null }))
                  setStep('date')
                }}
                style={{ '--card-accent': accent } as any}
              >
                <div className="staff-avatar any">✨</div>
                <div className="staff-info">
                  <span className="staff-name">Any Available</span>
                  <span className="staff-role">First available staff</span>
                </div>
              </button>
              {eligibleStaff.map(s => (
                <button
                  key={s.id}
                  className={`staff-card ${booking.staff?.id === s.id ? 'selected' : ''}`}
                  onClick={() => {
                    setBooking(b => ({ ...b, staff: s, date: null, slot: null }))
                    setStep('date')
                  }}
                  style={{ '--card-accent': accent } as any}
                >
                  <div className="staff-avatar">
                    {s.avatar_url
                      ? <img src={s.avatar_url} alt={s.name} />
                      : s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    }
                  </div>
                  <div className="staff-info">
                    <span className="staff-name">{s.name}</span>
                    {s.bio && <span className="staff-bio">{s.bio}</span>}
                  </div>
                </button>
              ))}
            </div>
          </StepSection>
        )}

        {/* ── Step: Date ── */}
        {step === 'date' && (
          <StepSection title="Pick a date" onBack={() => setStep('staff')}>
            <div className="date-grid">
              {dates.map(d => (
                <button
                  key={d.toISOString()}
                  className={`date-card ${booking.date?.toDateString() === d.toDateString() ? 'selected' : ''}`}
                  style={booking.date?.toDateString() === d.toDateString() ? { background: accent, color: '#fff', border: `2px solid ${accent}` } : {}}
                  onClick={() => {
                    setBooking(b => ({ ...b, date: d, slot: null }))
                    setStep('time')
                  }}
                >
                  <span className="date-day">
                    {isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'EEE')}
                  </span>
                  <span className="date-num">{format(d, 'd')}</span>
                  <span className="date-month">{format(d, 'MMM')}</span>
                </button>
              ))}
            </div>
          </StepSection>
        )}

        {/* ── Step: Time ── */}
        {step === 'time' && (
          <StepSection
            title={`Available times — ${booking.date ? format(booking.date, 'EEEE, d MMMM') : ''}`}
            onBack={() => setStep('date')}
          >
            {loadingSlots ? (
              <div className="loading-slots">
                <div className="spinner" style={{ borderTopColor: accent }} />
                <p>Checking availability…</p>
              </div>
            ) : slots.filter(s => s.available).length === 0 ? (
              <div className="no-slots">
                <p>No available slots on this date.</p>
                <button className="link-btn" onClick={() => setStep('date')}>
                  Choose another date →
                </button>
              </div>
            ) : (
              <div className="time-grid">
                {slots.filter(s => s.available).map(slot => (
                  <button
                    key={slot.starts_at}
                    className={`time-slot ${booking.slot?.starts_at === slot.starts_at ? 'selected' : ''}`}
                    style={booking.slot?.starts_at === slot.starts_at
                      ? { background: accent, color: '#fff', borderColor: accent }
                      : {}}
                    onClick={() => {
                      setBooking(b => ({ ...b, slot }))
                      setStep('details')
                    }}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </StepSection>
        )}

        {/* ── Step: Details ── */}
        {step === 'details' && (
          <StepSection title="Your details" onBack={() => setStep('time')}>
            {/* Booking summary */}
            <div className="booking-summary" style={{ borderColor: accent }}>
              <div className="summary-row"><span>Service</span><strong>{booking.service?.name}</strong></div>
              <div className="summary-row"><span>With</span><strong>{booking.staff?.name}</strong></div>
              <div className="summary-row"><span>Date</span><strong>{booking.date ? format(booking.date, 'EEEE d MMMM') : ''}</strong></div>
              <div className="summary-row"><span>Time</span><strong>{booking.slot?.label}</strong></div>
              {booking.service?.price && (
                <div className="summary-row"><span>Price</span><strong>£{booking.service.price.toFixed(2)}</strong></div>
              )}
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Full name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div className="form-field">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com"
                  required
                />
              </div>
              <div className="form-field">
                <label>Phone (optional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+44 7700 000000"
                />
              </div>
              <div className="form-field full-width">
                <label>Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any special requests or notes…"
                  rows={3}
                />
              </div>
            </div>

            <button
              className="confirm-btn"
              style={{ background: accent }}
              onClick={submitBooking}
              disabled={submitting}
            >
              {submitting ? 'Confirming…' : 'Confirm Booking'}
            </button>
          </StepSection>
        )}

        {/* ── Step: Confirmed ── */}
        {step === 'confirmed' && confirmRef && (
          <div className="confirmation-screen">
            <div className="confirm-icon" style={{ background: accent + '22', color: accent }}>✓</div>
            <h2>Booking Confirmed!</h2>
            <p className="confirm-ref">Ref: <strong>{confirmRef}</strong></p>
            <p>A confirmation has been sent to <strong>{form.email}</strong></p>

            <div className="booking-summary" style={{ borderColor: accent }}>
              <div className="summary-row"><span>Service</span><strong>{booking.service?.name}</strong></div>
              <div className="summary-row"><span>With</span><strong>{booking.staff?.name}</strong></div>
              <div className="summary-row"><span>Date</span><strong>{booking.date ? format(booking.date, 'EEEE d MMMM yyyy') : ''}</strong></div>
              <div className="summary-row"><span>Time</span><strong>{booking.slot?.label}</strong></div>
            </div>

            <button
              className="confirm-btn"
              style={{ background: accent }}
              onClick={reset}
            >
              Book another appointment
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .booking-container {
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Geist', system-ui, sans-serif;
        }
        .booking-header {
          padding: 28px 20px;
          color: white;
        }
        .booking-header-inner {
          max-width: 680px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .business-logo { width: 48px; height: 48px; border-radius: 12px; object-fit: cover; }
        .business-name { font-size: 22px; font-weight: 700; margin: 0; }
        .business-tagline { margin: 2px 0 0; opacity: .8; font-size: 14px; }

        .progress-bar {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 20px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          overflow-x: auto;
        }
        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          opacity: .4;
          transition: opacity .2s;
          min-width: 56px;
        }
        .progress-step.active, .progress-step.done { opacity: 1; }
        .step-dot {
          width: 28px; height: 28px;
          border-radius: 50%;
          border: 2px solid #d1d5db;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600; color: #9ca3af;
          background: white;
        }
        .progress-step.active .step-dot {
          background: var(--step-color, #6366f1);
          border-color: var(--step-color, #6366f1);
          color: white;
        }
        .progress-step.done .step-dot {
          background: var(--step-color, #6366f1);
          border-color: var(--step-color, #6366f1);
          color: white;
        }
        .step-label { font-size: 11px; color: #6b7280; }

        .booking-content {
          max-width: 680px;
          margin: 0 auto;
          padding: 24px 16px 60px;
        }
        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        /* Service cards */
        .service-grid { display: flex; flex-direction: column; gap: 10px; }
        .service-card {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 16px; background: white; border: 2px solid #e5e7eb;
          border-radius: 12px; cursor: pointer; text-align: left;
          transition: all .15s; width: 100%;
        }
        .service-card:hover { border-color: var(--card-accent); transform: translateY(-1px); }
        .service-card.selected { border-color: var(--card-accent); background: var(--card-accent)08; }
        .service-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
        .service-info { flex: 1; }
        .service-name { font-weight: 600; font-size: 16px; color: #111; display: block; }
        .service-meta { display: flex; gap: 12px; margin-top: 4px; font-size: 14px; color: #6b7280; }
        .service-desc { font-size: 13px; color: #9ca3af; margin-top: 6px; }

        /* Staff cards */
        .staff-grid { display: flex; flex-direction: column; gap: 10px; }
        .staff-card {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px; background: white; border: 2px solid #e5e7eb;
          border-radius: 12px; cursor: pointer; text-align: left;
          transition: all .15s; width: 100%;
        }
        .staff-card:hover { border-color: var(--card-accent); }
        .staff-card.selected { border-color: var(--card-accent); background: var(--card-accent)08; }
        .staff-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: #f3f4f6; display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 15px; color: #374151; flex-shrink: 0; overflow: hidden;
        }
        .staff-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .staff-avatar.any { background: linear-gradient(135deg, #faf5ff, #ede9fe); font-size: 20px; }
        .staff-name { font-weight: 600; font-size: 15px; color: #111; display: block; }
        .staff-role { font-size: 13px; color: #9ca3af; }
        .staff-bio { font-size: 13px; color: #6b7280; }

        /* Date picker */
        .date-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
          gap: 8px;
        }
        .date-card {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 10px 4px; background: white; border: 2px solid #e5e7eb;
          border-radius: 10px; cursor: pointer; transition: all .15s;
        }
        .date-card:hover { border-color: #9ca3af; }
        .date-day { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: .5px; }
        .date-num { font-size: 22px; font-weight: 700; color: #111; line-height: 1; }
        .date-month { font-size: 11px; color: #6b7280; }

        /* Time slots */
        .time-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 8px;
        }
        .time-slot {
          padding: 10px 4px; background: white; border: 2px solid #e5e7eb;
          border-radius: 8px; font-size: 14px; font-weight: 600; color: #374151;
          cursor: pointer; transition: all .15s;
        }
        .time-slot:hover { border-color: #9ca3af; }
        .loading-slots, .no-slots {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 40px; color: #9ca3af; font-size: 14px;
        }
        .spinner {
          width: 32px; height: 32px; border-radius: 50%;
          border: 3px solid #e5e7eb; border-top-color: #6366f1;
          animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .link-btn { background: none; border: none; color: #6366f1; cursor: pointer; font-size: 14px; }

        /* Booking summary */
        .booking-summary {
          background: white; border: 2px solid; border-radius: 12px;
          padding: 16px; margin-bottom: 20px;
        }
        .summary-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px;
        }
        .summary-row:last-child { border-bottom: none; }
        .summary-row span { color: #6b7280; }

        /* Form */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
        .form-field { display: flex; flex-direction: column; gap: 6px; }
        .form-field.full-width { grid-column: 1 / -1; }
        .form-field label { font-size: 13px; font-weight: 600; color: #374151; }
        .form-field input, .form-field textarea {
          padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px;
          font-size: 15px; color: #111; background: white; transition: border-color .15s;
          width: 100%; box-sizing: border-box;
        }
        .form-field input:focus, .form-field textarea:focus {
          outline: none; border-color: var(--accent, #6366f1);
        }

        .confirm-btn {
          width: 100%; padding: 16px; border: none; border-radius: 12px;
          color: white; font-size: 16px; font-weight: 700; cursor: pointer;
          transition: opacity .15s;
        }
        .confirm-btn:hover { opacity: .9; }
        .confirm-btn:disabled { opacity: .6; cursor: not-allowed; }

        /* Confirmation */
        .confirmation-screen {
          display: flex; flex-direction: column; align-items: center;
          gap: 16px; text-align: center; padding: 20px 0;
        }
        .confirm-icon {
          width: 72px; height: 72px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: 700;
        }
        .confirmation-screen h2 { font-size: 26px; font-weight: 800; color: #111; margin: 0; }
        .confirm-ref { font-size: 18px; color: #6b7280; }
        .confirmation-screen .booking-summary { width: 100%; text-align: left; }

        @media (max-width: 520px) {
          .form-grid { grid-template-columns: 1fr; }
          .date-grid { grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); }
        }
      `}</style>
    </div>
  )
}

function StepSection({
  title, children, onBack
}: {
  title: string, children: React.ReactNode, onBack?: () => void
}) {
  return (
    <div>
      <div className="step-header">
        {onBack && (
          <button className="back-btn" onClick={onBack}>← Back</button>
        )}
        <h2 className="step-title">{title}</h2>
      </div>
      {children}
      <style jsx>{`
        .step-header { margin-bottom: 20px; }
        .back-btn {
          background: none; border: none; color: #6b7280; cursor: pointer;
          font-size: 14px; padding: 0; margin-bottom: 8px; display: block;
        }
        .back-btn:hover { color: #111; }
        .step-title { font-size: 20px; font-weight: 700; color: #111; margin: 0; }
      `}</style>
    </div>
  )
}
