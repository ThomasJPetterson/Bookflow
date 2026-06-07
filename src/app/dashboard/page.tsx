'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { format, startOfToday, endOfDay } from 'date-fns'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

export default function DashboardPage() {
  const [business, setBusiness] = useState<any>(null)
  const [todayBookings, setTodayBookings] = useState<any[]>([])
  const [stats, setStats] = useState({ today: 0, week: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: biz } = await supabase
        .from('businesses').select('*').eq('owner_id', user.id).single()
      if (!biz) return

      setBusiness(biz)

      const todayStart = startOfToday().toISOString()
      const todayEnd = endOfDay(new Date()).toISOString()

      const [todayRes, totalRes, weekRes] = await Promise.all([
        supabase.from('bookings')
          .select('*, service:services(name, duration_mins), staff:staff(name)')
          .eq('business_id', biz.id).neq('status', 'cancelled')
          .gte('starts_at', todayStart).lte('starts_at', todayEnd).order('starts_at'),
        supabase.from('bookings').select('id', { count: 'exact' })
          .eq('business_id', biz.id).neq('status', 'cancelled'),
        supabase.from('bookings').select('id', { count: 'exact' })
          .eq('business_id', biz.id).neq('status', 'cancelled')
          .gte('starts_at', todayStart),
      ])

      setTodayBookings(todayRes.data ?? [])
      setStats({ today: todayRes.data?.length ?? 0, week: weekRes.count ?? 0, total: totalRes.count ?? 0 })
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !business) return <div style={{ padding: 32, color: '#6b7280' }}>Loading...</div>

  const accent = business.color_accent ?? '#6366f1'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning! 👋</h1>
          <p className="page-sub">{format(new Date(), 'EEEE, d MMMM yyyy')} · {business.name}</p>
        </div>
        <a href={`/book/${business.slug}`} target="_blank" rel="noopener noreferrer"
          className="booking-page-btn" style={{ background: accent }}>
          View Booking Page ↗
        </a>
      </div>

      <div className="stats-grid">
        {[
          { label: "Today's Bookings", value: stats.today, icon: '📅', color: accent },
          { label: 'This Week', value: stats.week, icon: '📊', color: '#10b981' },
          { label: 'All Time', value: stats.total, icon: '✅', color: '#f59e0b' },
          { label: 'Booking Link', value: `/book/${business.slug}`, icon: '🔗', color: '#3b82f6', isLink: true },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: stat.color + '18', color: stat.color }}>{stat.icon}</div>
            <div className="stat-body">
              <div className="stat-value" style={{ color: stat.color }}>
                {stat.isLink ? <a href={`/book/${business.slug}`} target="_blank" style={{ color: stat.color, textDecoration: 'none', fontSize: 13 }}>/book/{business.slug}</a> : stat.value}
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section">
        <h2 className="section-title">Today's Schedule</h2>
        {todayBookings.length === 0 ? (
          <div className="empty-state">
            <p>No bookings today.</p>
            <a href={`/book/${business.slug}`} target="_blank" className="share-link" style={{ color: accent }}>Share your booking link →</a>
          </div>
        ) : (
          <div className="bookings-list">
            {todayBookings.map((b: any) => (
              <div key={b.id} className="booking-row">
                <div className="booking-time" style={{ color: accent }}>{format(new Date(b.starts_at), 'HH:mm')}</div>
                <div className="booking-details">
                  <div className="booking-client">{b.client_name}</div>
                  <div className="booking-meta">{b.service?.name} · {b.staff?.name} · {b.service?.duration_mins}min</div>
                </div>
                <div className={`booking-status status-${b.status}`}>{b.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
