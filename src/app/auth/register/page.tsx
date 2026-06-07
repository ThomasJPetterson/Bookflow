'use client'
// ============================================================
// Register Page — New Business Sign Up
// ============================================================
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    business_name: '',
    email:         '',
    password:      '',
    confirm:       '',
    timezone:      'Europe/London',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true); setError(null)

    // 1. Register business via API (creates user + business)
    const res = await fetch('/api/auth/register-business', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:         form.email,
        password:      form.password,
        business_name: form.business_name,
        timezone:      form.timezone,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    // 2. Sign in
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    form.email,
      password: form.password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-logo">BF</div>
          <h1>BookFlow</h1>
        </div>
        <h2 className="auth-title">Create your booking business</h2>
        <p className="auth-sub">Get your online booking page live in under 2 minutes.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleRegister} className="auth-form">
          <div className="field">
            <label>Business Name *</label>
            <input
              value={form.business_name}
              onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
              required placeholder="e.g. Luxe Beauty Studio"
            />
          </div>
          <div className="field">
            <label>Email *</label>
            <input
              type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required placeholder="you@business.com"
            />
          </div>
          <div className="field">
            <label>Password *</label>
            <input
              type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required placeholder="Min 8 characters"
            />
          </div>
          <div className="field">
            <label>Confirm Password *</label>
            <input
              type="password" value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              required placeholder="Re-enter password"
            />
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Creating your business…' : 'Create Business & Start →'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link href="/auth/login">Sign in →</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh; background: linear-gradient(135deg, #f0f4ff 0%, #f8fafc 100%);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .auth-card {
          background: white; border-radius: 20px; padding: 40px;
          width: 100%; max-width: 440px; box-shadow: 0 4px 24px rgba(0,0,0,.08);
        }
        .auth-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .brand-logo {
          width: 44px; height: 44px; background: #6366f1; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 16px; color: white;
        }
        .auth-brand h1 { font-size: 22px; font-weight: 800; color: #111; margin: 0; }
        .auth-title { font-size: 20px; font-weight: 800; color: #111; margin: 0 0 6px; }
        .auth-sub { font-size: 14px; color: #9ca3af; margin: 0 0 20px; }
        .error-msg { background: #fef2f2; color: #b91c1c; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
        .auth-form { display: flex; flex-direction: column; gap: 14px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label { font-size: 13px; font-weight: 600; color: #374151; }
        .field input {
          padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-size: 15px; outline: none; transition: border-color .15s;
        }
        .field input:focus { border-color: #6366f1; }
        .submit-btn {
          padding: 13px; background: #6366f1; color: white; border: none;
          border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 4px;
        }
        .submit-btn:hover { background: #4f46e5; }
        .submit-btn:disabled { opacity: .6; cursor: not-allowed; }
        .auth-link { margin-top: 20px; font-size: 14px; color: #6b7280; text-align: center; }
        .auth-link :global(a) { color: #6366f1; text-decoration: none; font-weight: 600; }
      `}</style>
    </div>
  )
}
