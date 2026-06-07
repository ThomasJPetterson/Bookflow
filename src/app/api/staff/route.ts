import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helper'

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const { data: business } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'No business found' }, { status: 404 })

  // Fetch staff without joins first
  const { data: staffList, error } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch availability rules and staff_services separately
  const staffIds = (staffList ?? []).map((s: any) => s.id)

  const [rulesRes, servicesRes] = await Promise.all([
    staffIds.length ? supabase.from('availability_rules').select('*').in('staff_id', staffIds) : { data: [] },
    staffIds.length ? supabase.from('staff_services').select('*').in('staff_id', staffIds) : { data: [] },
  ])

  const rules = rulesRes.data ?? []
  const services = servicesRes.data ?? []

  // Merge into staff objects
  const staff = (staffList ?? []).map((s: any) => ({
    ...s,
    availability_rules: rules.filter((r: any) => r.staff_id === s.id),
    staff_services: services.filter((ss: any) => ss.staff_id === s.id),
  }))

  return NextResponse.json({ staff })
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const { data: business } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'No business found' }, { status: 404 })

  const body = await req.json()
  const { name, email, bio, role, availability_rules, service_ids } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const { data: staff, error } = await supabase
    .from('staff')
    .insert({ business_id: business.id, name: name.trim(), email, bio, role: role ?? 'staff' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (availability_rules?.length) {
    await supabase.from('availability_rules').insert(
      availability_rules.map((r: any) => ({
        staff_id: staff.id,
        business_id: business.id,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        is_active: true,
      }))
    )
  }

  if (service_ids?.length) {
    await supabase.from('staff_services').insert(
      service_ids.map((sid: string) => ({ staff_id: staff.id, service_id: sid }))
    )
  }

  return NextResponse.json({ staff }, { status: 201 })
}
