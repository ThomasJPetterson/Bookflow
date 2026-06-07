'use client'
// ============================================================
// Login Page
// ============================================================
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-logo">BF</div>
          <h1>BookFlow</h1>
        </div>
        <h2 className="auth-title">Sign in to your dashboard</h2>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@business.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <Link href="/auth/register">Register your business →</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh; background: #f8fafc;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .auth-card {
          background: white; border-radius: 20px; padding: 40px;
          width: 100%; max-width: 420px; box-shadow: 0 4px 24px rgba(0,0,0,.08);
        }
        .auth-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
        .brand-logo {
          width: 44px; height: 44px; background: #6366f1; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 16px; color: white;
        }
        .auth-brand h1 { font-size: 22px; font-weight: 800; color: #111; margin: 0; }
        .auth-title { font-size: 18px; font-weight: 700; color: #111; margin: 0 0 20px; }
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
          padding: 12px; background: #6366f1; color: white; border: none;
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
