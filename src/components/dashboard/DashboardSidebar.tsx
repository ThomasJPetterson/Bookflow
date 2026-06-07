'use client'
// ============================================================
// Dashboard Sidebar
// ============================================================
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Business } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard',           label: 'Overview',   icon: '◻' },
  { href: '/dashboard/bookings',  label: 'Bookings',   icon: '📅' },
  { href: '/dashboard/calendar',  label: 'Calendar',   icon: '🗓' },
  { href: '/dashboard/staff',     label: 'Staff',      icon: '👥' },
  { href: '/dashboard/services',  label: 'Services',   icon: '✂' },
  { href: '/dashboard/settings',  label: 'Settings',   icon: '⚙' },
]

export function DashboardSidebar({ business }: { business: Business }) {
  const pathname = usePathname()
  const router   = useRouter()
  const accent   = business.color_accent ?? '#6366f1'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand" style={{ background: accent }}>
        <div className="brand-avatar">
          {business.name.charAt(0).toUpperCase()}
        </div>
        <div className="brand-info">
          <span className="brand-name">{business.name}</span>
          <span className="brand-sub">Dashboard</span>
        </div>
      </div>

      {/* Booking link */}
      <div className="booking-link-box">
        <span className="booking-link-label">Your booking page</span>
        <a
          href={`/book/${business.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="booking-link"
        >
          /book/{business.slug} ↗
        </a>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={isActive ? { background: accent + '18', color: accent, borderColor: accent } : {}}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="signout-btn" onClick={handleSignOut}>
          Sign out
        </button>
        <span className="powered-by">Powered by BookFlow</span>
      </div>

      <style jsx>{`
        .sidebar {
          width: 260px;
          min-height: 100vh;
          background: white;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        .sidebar-brand {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-avatar {
          width: 40px; height: 40px;
          border-radius: 10px;
          background: rgba(255,255,255,.25);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 18px; color: white;
        }
        .brand-name { display: block; font-weight: 700; font-size: 15px; color: white; }
        .brand-sub { font-size: 12px; color: rgba(255,255,255,.7); }

        .booking-link-box {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .booking-link-label {
          display: block; font-size: 11px; color: #9ca3af;
          text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px;
        }
        .booking-link {
          font-size: 12px; color: #6366f1; text-decoration: none; word-break: break-all;
        }
        .booking-link:hover { text-decoration: underline; }

        .sidebar-nav {
          flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px;
        }
        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 8px; font-size: 14px; font-weight: 500;
          color: #4b5563; text-decoration: none; transition: all .15s;
          border: 1px solid transparent;
        }
        .nav-item:hover { background: #f9fafb; color: #111; }
        .nav-icon { font-size: 16px; width: 20px; text-align: center; }

        .sidebar-footer {
          padding: 16px; border-top: 1px solid #f3f4f6;
          display: flex; flex-direction: column; gap: 8px;
        }
        .signout-btn {
          background: none; border: 1px solid #e5e7eb; padding: 8px;
          border-radius: 8px; font-size: 13px; color: #6b7280; cursor: pointer;
          transition: all .15s;
        }
        .signout-btn:hover { background: #f9fafb; color: #111; }
        .powered-by { font-size: 11px; color: #d1d5db; text-align: center; }

        @media (max-width: 768px) {
          .sidebar {
            width: 100%; min-height: auto;
            border-right: none; border-bottom: 1px solid #e5e7eb;
          }
        }
      `}</style>
    </aside>
  )
}
