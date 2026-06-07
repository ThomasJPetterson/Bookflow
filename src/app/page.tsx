'use client'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="landing">
      <nav className="nav">
        <div className="nav-brand">
          <div className="brand-dot" />
          <span>BookFlow</span>
        </div>
        <div className="nav-links">
          <Link href="/auth/login">Sign In</Link>
          <Link href="/auth/register" className="cta-btn">Get Started Free →</Link>
        </div>
      </nav>

      <section className="hero">
        <h1 className="hero-title">
          Online booking for<br />your business,{' '}
          <span className="gradient-text">ready in minutes.</span>
        </h1>
        <p className="hero-sub">
          Give your clients a beautiful booking page. Manage staff, services, and
          appointments in one simple dashboard. No technical skills needed.
        </p>
        <div className="hero-actions">
          <Link href="/auth/register" className="hero-btn-primary">
            Start for free — no credit card
          </Link>
          <Link href="/book/luxe-beauty" className="hero-btn-secondary">
            See a demo booking page →
          </Link>
        </div>
      </section>

      <section className="features">
        {[
          { icon: '📅', title: 'Smart scheduling', desc: 'Clients pick services, staff, date and time. You never get double-booked.' },
          { icon: '👥', title: 'Staff calendars', desc: 'Each team member has their own schedule. Filter by staff in the calendar view.' },
          { icon: '✉', title: 'Auto confirmations', desc: 'Email confirmations sent automatically to both client and business.' },
          { icon: '🔗', title: 'Unique booking link', desc: 'Share /book/your-name on social, WhatsApp, anywhere. Instantly bookable.' },
          { icon: '🏢', title: 'Multi-tenant', desc: 'Every business is fully isolated. No cross-tenant data leakage. Ever.' },
          { icon: '🚀', title: 'Deploy for free', desc: 'Runs on Vercel + Supabase free tiers. Start with zero cost, scale as you grow.' },
        ].map(f => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>

      <style jsx>{`
        .landing { min-height: 100vh; background: #fafafa; }
        .nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 40px; border-bottom: 1px solid #f0f0f0; background: white;
        }
        .nav-brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 18px; }
        .brand-dot { width: 10px; height: 10px; border-radius: 50%; background: #6366f1; }
        .nav-links { display: flex; align-items: center; gap: 20px; }
        .nav-links :global(a) { font-size: 14px; color: #6b7280; text-decoration: none; }
        .cta-btn {
          background: #111 !important; color: white !important; padding: 8px 16px;
          border-radius: 8px; font-weight: 600; font-size: 14px !important;
        }

        .hero { max-width: 720px; margin: 0 auto; text-align: center; padding: 80px 20px 60px; }
        .hero-title { font-size: 52px; font-weight: 900; line-height: 1.1; color: #111; margin: 0 0 20px; }
        .gradient-text { background: linear-gradient(135deg, #6366f1, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero-sub { font-size: 18px; color: #6b7280; max-width: 520px; margin: 0 auto 36px; line-height: 1.6; }
        .hero-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
        .hero-btn-primary {
          padding: 14px 28px; background: #6366f1; color: white; border-radius: 12px;
          font-weight: 700; font-size: 16px; text-decoration: none; transition: background .15s;
        }
        .hero-btn-primary:hover { background: #4f46e5; }
        .hero-btn-secondary {
          padding: 14px 28px; background: white; color: #374151; border-radius: 12px;
          font-weight: 600; font-size: 16px; text-decoration: none; border: 1.5px solid #e5e7eb;
        }

        .features {
          max-width: 1000px; margin: 0 auto; padding: 40px 20px 80px;
          display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;
        }
        .feature-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #f0f0f0; }
        .feature-icon { font-size: 28px; margin-bottom: 12px; }
        .feature-card h3 { font-size: 16px; font-weight: 700; color: #111; margin: 0 0 8px; }
        .feature-card p { font-size: 14px; color: #6b7280; line-height: 1.5; margin: 0; }

        @media (max-width: 600px) {
          .hero-title { font-size: 34px; }
          .nav { padding: 16px 20px; }
        }
      `}</style>
    </div>
  )
}
