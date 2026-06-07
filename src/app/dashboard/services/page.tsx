'use client'
// ============================================================
// Services Management Page
// ============================================================
import { useState, useEffect } from 'react'
import type { Service } from '@/types'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

const COLORS = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#0ea5e9']

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editService, setEditService] = useState<Service | null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', description: '',
    duration_mins: 60, price: '', color: COLORS[0],
  })

  useEffect(() => { fetchServices() }, [])

  async function fetchServices() {
    const res = await fetchWithAuth('/api/services')
    const { services } = await res.json()
    setServices(services ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditService(null)
    setForm({ name: '', description: '', duration_mins: 60, price: '', color: COLORS[0] })
    setError(null); setShowModal(true)
  }

  function openEdit(svc: Service) {
    setEditService(svc)
    setForm({
      name:          svc.name,
      description:   svc.description ?? '',
      duration_mins: svc.duration_mins,
      price:         svc.price?.toString() ?? '',
      color:         svc.color,
    })
    setError(null); setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.duration_mins) {
      setError('Name and duration are required'); return
    }
    setSaving(true); setError(null)
    try {
      const body = editService
        ? { id: editService.id, ...form, duration_mins: Number(form.duration_mins), price: form.price ? Number(form.price) : null }
        : { ...form, duration_mins: Number(form.duration_mins), price: form.price ? Number(form.price) : null }

      const method = editService ? 'PUT' : 'POST'
      const res = await fetchWithAuth('/api/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await fetchServices()
      setShowModal(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(svc: Service) {
    await fetchWithAuth('/api/services', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: svc.id, is_active: !svc.is_active }),
    })
    fetchServices()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Services</h1>
        <button className="add-btn" onClick={openCreate}>+ Add Service</button>
      </div>

      {loading ? (
        <div className="loading">Loading services…</div>
      ) : (
        <div className="services-list">
          {services.map(svc => (
            <div key={svc.id} className={`service-row ${!svc.is_active ? 'inactive' : ''}`}>
              <div className="svc-color" style={{ background: svc.color }} />
              <div className="svc-info">
                <span className="svc-name">{svc.name}</span>
                {svc.description && <span className="svc-desc">{svc.description}</span>}
              </div>
              <div className="svc-duration">{svc.duration_mins} min</div>
              <div className="svc-price">{svc.price ? `£${svc.price.toFixed(2)}` : 'Free'}</div>
              <div className="svc-status">
                <span className={`status-badge ${svc.is_active ? 'active' : 'inactive'}`}>
                  {svc.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <div className="svc-actions">
                <button className="action-btn" onClick={() => openEdit(svc)}>Edit</button>
                <button className="action-btn toggle" onClick={() => toggleActive(svc)}>
                  {svc.is_active ? 'Hide' : 'Show'}
                </button>
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
              <h2>{editService ? 'Edit Service' : 'New Service'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <div className="modal-body">
              <div className="field">
                <label>Service name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Classic Manicure" />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional description…" />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Duration (mins) *</label>
                  <input type="number" value={form.duration_mins} onChange={e => setForm(f => ({ ...f, duration_mins: Number(e.target.value) }))} min={5} step={5} />
                </div>
                <div className="field">
                  <label>Price (£)</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" step={0.01} min={0} />
                </div>
              </div>
              <div className="field">
                <label>Colour</label>
                <div className="color-grid">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      className={`color-btn ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editService ? 'Save Changes' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .page-title { font-size: 24px; font-weight: 800; color: #111; margin: 0; }
        .add-btn { background: #111; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }

        .services-list { background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
        .service-row {
          display: flex; align-items: center; gap: 16px; padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
        }
        .service-row:last-child { border-bottom: none; }
        .service-row.inactive { opacity: .5; }
        .svc-color { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
        .svc-info { flex: 1; }
        .svc-name { font-weight: 600; font-size: 15px; color: #111; display: block; }
        .svc-desc { font-size: 13px; color: #9ca3af; }
        .svc-duration, .svc-price { font-size: 14px; color: #6b7280; min-width: 60px; }
        .status-badge { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
        .status-badge.active { background: #dcfce7; color: #15803d; }
        .status-badge.inactive { background: #f3f4f6; color: #9ca3af; }
        .svc-actions { display: flex; gap: 6px; }
        .action-btn { padding: 5px 12px; border: 1px solid #e5e7eb; border-radius: 6px; background: white; font-size: 13px; cursor: pointer; color: #374151; }
        .action-btn:hover { background: #f9fafb; }
        .loading { background: white; border-radius: 14px; padding: 60px; text-align: center; color: #9ca3af; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
        .modal { background: white; border-radius: 16px; width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,.15); }
        .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f3f4f6; }
        .modal-header h2 { font-size: 18px; font-weight: 700; margin: 0; }
        .close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #9ca3af; }
        .error-msg { background: #fef2f2; color: #b91c1c; padding: 10px 24px; font-size: 14px; }
        .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label { font-size: 13px; font-weight: 600; color: #374151; }
        .field input, .field textarea { padding: 9px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; }
        .field input:focus, .field textarea:focus { border-color: #6366f1; }
        .color-grid { display: flex; gap: 8px; flex-wrap: wrap; }
        .color-btn { width: 32px; height: 32px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; transition: transform .15s; }
        .color-btn.selected { border-color: white; outline: 2px solid #111; transform: scale(1.15); }
        .modal-footer { display: flex; gap: 10px; padding: 16px 24px; justify-content: flex-end; border-top: 1px solid #f3f4f6; }
        .cancel-btn { padding: 10px 18px; border: 1px solid #e5e7eb; border-radius: 10px; background: white; font-size: 14px; cursor: pointer; }
        .save-btn { padding: 10px 20px; background: #111; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .save-btn:disabled { opacity: .6; }
      `}</style>
    </div>
  )
}
