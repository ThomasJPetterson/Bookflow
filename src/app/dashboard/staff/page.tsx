'use client'
// ============================================================
// Staff Management Page
// ============================================================
import { useState, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import type { Staff, Service } from '@/types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function initAvailability() {
  return [1, 2, 3, 4, 5].map(day => ({
    day_of_week: day,
    start_time:  '09:00',
    end_time:    '18:00',
    is_active:   true,
  }))
}

export default function StaffPage() {
  const [staff, setStaff]       = useState<any[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', email: '', bio: '',
    service_ids: [] as string[],
    availability: initAvailability(),
  })

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/staff').then(r => r.json()),
      fetchWithAuth('/api/services').then(r => r.json()),
    ]).then(([staffData, svcData]) => {
      setStaff(staffData.staff ?? [])
      setServices(svcData.services ?? [])
      setLoading(false)
    })
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm({ name: '', email: '', bio: '', service_ids: [], availability: initAvailability() })
    setError(null)
    setShowModal(true)
  }

  function openEdit(member: any) {
    setEditingId(member.id)
    setForm({
      name:         member.name,
      email:        member.email ?? '',
      bio:          member.bio ?? '',
      service_ids:  member.staff_services?.map((ss: any) => ss.service_id) ?? [],
      availability: member.availability_rules?.length
        ? member.availability_rules
        : initAvailability(),
    })
    setError(null)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError(null)
    try {
      const url    = editingId ? `/api/staff/${editingId}` : '/api/staff'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          availability_rules: form.availability,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated = await fetchWithAuth('/api/staff').then(r => r.json())
      setStaff(updated.staff ?? [])
      setShowModal(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this staff member?')) return
    await fetchWithAuth(`/api/staff/${id}`, { method: 'DELETE' })
    const updated = await fetchWithAuth('/api/staff').then(r => r.json())
    setStaff(updated.staff ?? [])
  }

  function toggleService(id: string) {
    setForm(f => ({
      ...f,
      service_ids: f.service_ids.includes(id)
        ? f.service_ids.filter(s => s !== id)
        : [...f.service_ids, id],
    }))
  }

  function updateAvailability(idx: number, field: string, value: any) {
    setForm(f => ({
      ...f,
      availability: f.availability.map((a, i) => i === idx ? { ...a, [field]: value } : a),
    }))
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Staff</h1>
        <button className="add-btn" onClick={openCreate}>+ Add Staff</button>
      </div>

      {loading ? (
        <div className="loading">Loading staff…</div>
      ) : (
        <div className="staff-grid">
          {staff.map(member => (
            <div key={member.id} className={`staff-card ${!member.is_active ? 'inactive' : ''}`}>
              <div className="staff-header">
                <div className="avatar">{member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</div>
                <div>
                  <div className="staff-name">{member.name}</div>
                  {member.email && <div className="staff-email">{member.email}</div>}
                </div>
              </div>

              {member.bio && <p className="staff-bio">{member.bio}</p>}

              <div className="staff-services">
                {(member.staff_services ?? []).map((ss: any) => {
                  const svc = services.find(s => s.id === ss.service_id)
                  return svc ? (
                    <span key={ss.service_id} className="svc-chip" style={{ background: svc.color + '22', color: svc.color }}>
                      {svc.name}
                    </span>
                  ) : null
                })}
              </div>

              <div className="staff-actions">
                <button className="action-btn edit" onClick={() => openEdit(member)}>Edit</button>
                {member.is_active && (
                  <button className="action-btn deactivate" onClick={() => handleDeactivate(member.id)}>
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Staff' : 'Add Staff Member'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="form-section">
              <h3>Details</h3>
              <div className="form-row">
                <div className="field">
                  <label>Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Staff name" />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                </div>
              </div>
              <div className="field">
                <label>Bio</label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short bio…" rows={2} />
              </div>
            </div>

            <div className="form-section">
              <h3>Services</h3>
              <div className="services-check-grid">
                {services.map(svc => (
                  <label key={svc.id} className="svc-check">
                    <input
                      type="checkbox"
                      checked={form.service_ids.includes(svc.id)}
                      onChange={() => toggleService(svc.id)}
                    />
                    <span style={{ color: svc.color }}>{svc.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-section">
              <h3>Working Hours</h3>
              <div className="availability-grid">
                {form.availability.map((rule, i) => (
                  <div key={i} className="avail-row">
                    <label className="day-toggle">
                      <input
                        type="checkbox"
                        checked={rule.is_active}
                        onChange={e => updateAvailability(i, 'is_active', e.target.checked)}
                      />
                      <span className="day-name">{DAYS[rule.day_of_week]}</span>
                    </label>
                    {rule.is_active && (
                      <>
                        <input type="time" value={rule.start_time} onChange={e => updateAvailability(i, 'start_time', e.target.value)} className="time-input" />
                        <span>—</span>
                        <input type="time" value={rule.end_time} onChange={e => updateAvailability(i, 'end_time', e.target.value)} className="time-input" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .page-title { font-size: 24px; font-weight: 800; color: #111; margin: 0; }
        .add-btn { background: #111; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .add-btn:hover { background: #333; }

        .staff-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .staff-card {
          background: white; border-radius: 14px; padding: 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,.06); transition: box-shadow .15s;
        }
        .staff-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
        .staff-card.inactive { opacity: .5; }
        .staff-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: #f3f4f6; display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 16px; color: #374151;
        }
        .staff-name { font-weight: 700; font-size: 16px; color: #111; }
        .staff-email { font-size: 13px; color: #9ca3af; }
        .staff-bio { font-size: 13px; color: #6b7280; margin: 0 0 12px; }
        .staff-services { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
        .svc-chip { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
        .staff-actions { display: flex; gap: 8px; }
        .action-btn { padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; }
        .action-btn.edit { background: #f3f4f6; color: #374151; }
        .action-btn.edit:hover { background: #e5e7eb; }
        .action-btn.deactivate { background: #fee2e2; color: #b91c1c; }

        .loading { background: white; border-radius: 14px; padding: 60px; text-align: center; color: #9ca3af; }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.4); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px;
        }
        .modal {
          background: white; border-radius: 16px; width: 100%; max-width: 560px;
          max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.15);
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid #f3f4f6; position: sticky; top: 0; background: white;
        }
        .modal-header h2 { font-size: 18px; font-weight: 700; margin: 0; }
        .close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #9ca3af; }
        .error-msg { background: #fef2f2; color: #b91c1c; padding: 10px 24px; font-size: 14px; }

        .form-section { padding: 16px 24px; border-bottom: 1px solid #f3f4f6; }
        .form-section h3 { font-size: 14px; font-weight: 700; color: #374151; margin: 0 0 12px; text-transform: uppercase; letter-spacing: .5px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .field label { font-size: 13px; font-weight: 600; color: #374151; }
        .field input, .field textarea {
          padding: 9px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px;
          font-size: 14px; outline: none; transition: border-color .15s;
        }
        .field input:focus, .field textarea:focus { border-color: #6366f1; }

        .services-check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .svc-check { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }

        .availability-grid { display: flex; flex-direction: column; gap: 8px; }
        .avail-row { display: flex; align-items: center; gap: 12px; }
        .day-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; min-width: 60px; }
        .day-name { font-size: 14px; font-weight: 600; color: #374151; }
        .time-input { padding: 6px 10px; border: 1.5px solid #e5e7eb; border-radius: 6px; font-size: 14px; }

        .modal-footer {
          display: flex; gap: 10px; padding: 16px 24px; justify-content: flex-end;
          border-top: 1px solid #f3f4f6; position: sticky; bottom: 0; background: white;
        }
        .cancel-btn { padding: 10px 18px; border: 1px solid #e5e7eb; border-radius: 10px; background: white; font-size: 14px; cursor: pointer; }
        .save-btn { padding: 10px 20px; background: #111; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .save-btn:disabled { opacity: .6; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
