import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createAdminClient()

  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (bizErr || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('name')

  // Manual join - no PostgREST relationship
  const { data: staffList } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('name')

  const staffIds = (staffList ?? []).map((s: any) => s.id)

  const { data: staffServices } = staffIds.length
    ? await supabase.from('staff_services').select('*').in('staff_id', staffIds)
    : { data: [] }

  const staff = (staffList ?? []).map((s: any) => ({
    ...s,
    services: (staffServices ?? []).filter((ss: any) => ss.staff_id === s.id).map((ss: any) => ss.service_id),
  }))

  return NextResponse.json({
    business,
    services: services ?? [],
    staff,
  })
}
