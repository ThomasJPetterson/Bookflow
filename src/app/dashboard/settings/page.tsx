'use client'
// ============================================================
// Business Settings Page
// ============================================================
import { useState, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

const TIMEZONES = [
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'America/New_York',
  'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney', 'Asia/Dubai',
]

const COLORS = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#0ea5e9','#14b8a6']

export default function SettingsPage() {
  const [form, setForm]   = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    fetchWithAuth('/api/business/settings').then(r => r.json()).then(({ business }) => {
      if (business) setForm(business)
    })
  }, [])

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await fetchWithAuth('/api/business/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!form) return <div className="loading">Loading settings…</div>

  return (
    <div>
      <h1 className="page-title">Settings</h1>

      <div className="settings-card">
        <h2 className="section-title">Business Details</h2>

        <div className="form-grid">
          <div className="field">
            <label>Business Name</label>
            <input value={form.name ?? ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label>Business Email</label>
            <input type="email" value={form.email ?? ''} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={form.phone ?? ''} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="field">
            <label>Address</label>
            <input value={form.address ?? ''} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="field">
            <label>Timezone</label>
            <select value={form.timezone ?? 'Europe/London'} onChange={e => setForm((f: any) => ({ ...f, timezone: e.target.value }))}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Booking URL slug</label>
            <div className="slug-display">
              <span className="slug-prefix">/book/</span>
              <span className="slug-value">{form.slug}</span>
            </div>
            <p className="field-hint">Slug cannot be changed after creation.</p>
          </div>
        </div>

        <div className="field">
          <label>Brand Colour</label>
          <div className="color-grid">
            {COLORS.map(c => (
              <button
                key={c}
                className={`color-btn ${form.color_accent === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setForm((f: any) => ({ ...f, color_accent: c }))}
              />
            ))}
          </div>
          <p className="field-hint">Used on your public booking page.</p>
        </div>
      </div>

      <div className="settings-card">
        <h2 className="section-title">Public Booking Page</h2>
        <div className="booking-link-preview">
          <div className="link-label">Your booking link:</div>
          <a href={`/book/${form.slug}`} target="_blank" className="booking-link">
            {typeof window !== 'undefined' ? window.location.origin : ''}/book/{form.slug}
          </a>
          <button
            className="copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/book/${form.slug}`)
            }}
          >
            Copy Link
          </button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {saved && <div className="success-msg">✓ Settings saved</div>}

      <button className="save-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>

      <style jsx>{`
        .page-title { font-size: 24px; font-weight: 800; color: #111; margin: 0 0 24px; }
        .settings-card { background: white; border-radius: 14px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
        .section-title { font-size: 16px; font-weight: 700; color: #111; margin: 0 0 20px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
        .field label { font-size: 13px; font-weight: 600; color: #374151; }
        .field input, .field select { padding: 9px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; }
        .field input:focus, .field select:focus { border-color: #6366f1; }
        .field-hint { font-size: 12px; color: #9ca3af; margin: 0; }
        .slug-display { display: flex; align-items: center; padding: 9px 12px; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 8px; }
        .slug-prefix { color: #9ca3af; font-size: 14px; }
        .slug-value { font-weight: 600; font-size: 14px; color: #6366f1; }
        .color-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
        .color-btn { width: 32px; height: 32px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; }
        .color-btn.selected { border-color: white; outline: 2px solid #111; transform: scale(1.15); }
        .booking-link-preview { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .link-label { font-size: 14px; color: #6b7280; }
        .booking-link { font-size: 14px; color: #6366f1; word-break: break-all; }
        .copy-btn { padding: 6px 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: white; font-size: 13px; cursor: pointer; }
        .error-msg { background: #fef2f2; color: #b91c1c; padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 14px; }
        .success-msg { background: #dcfce7; color: #15803d; padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 14px; }
        .save-btn { background: #111; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
        .save-btn:disabled { opacity: .6; }
        .loading { color: #9ca3af; padding: 40px; }
        @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
