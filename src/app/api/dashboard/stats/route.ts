import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helper'

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const { data: business } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'No business found' }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]

  const [todayRes, weekRes, totalRes] = await Promise.all([
    supabase.from('bookings').select('id', { count: 'exact' })
      .eq('business_id', business.id).neq('status', 'cancelled').gte('starts_at', `${today}T00:00:00`),
    supabase.from('bookings').select('id', { count: 'exact' })
      .eq('business_id', business.id).neq('status', 'cancelled'),
    supabase.from('bookings').select('id', { count: 'exact' })
      .eq('business_id', business.id).neq('status', 'cancelled'),
  ])

  return NextResponse.json({ today: todayRes.count ?? 0, week: weekRes.count ?? 0, total: totalRes.count ?? 0 })
}
