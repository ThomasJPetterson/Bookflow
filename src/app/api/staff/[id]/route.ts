import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helper'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getUserFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const { data: business, error: bizErr } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
    if (bizErr || !business) return NextResponse.json({ error: 'No business: ' + bizErr?.message }, { status: 401 })

    const body = await req.json()
    const { availability_rules, service_ids, ...fields } = body

    // Remove any fields that don't exist on the staff table
    const safeFields: any = {}
    if (fields.name !== undefined) safeFields.name = fields.name
    if (fields.email !== undefined) safeFields.email = fields.email
    if (fields.bio !== undefined) safeFields.bio = fields.bio
    if (fields.role !== undefined) safeFields.role = fields.role
    if (fields.is_active !== undefined) safeFields.is_active = fields.is_active

    const { data, error: staffErr } = await supabase
      .from('staff').update(safeFields).eq('id', params.id).eq('business_id', business.id).select().single()

    if (staffErr) return NextResponse.json({ error: 'Staff update failed: ' + staffErr.message }, { status: 500 })

    if (availability_rules && Array.isArray(availability_rules)) {
      const { error: delErr } = await supabase.from('availability_rules').delete().eq('staff_id', params.id)
      if (delErr) return NextResponse.json({ error: 'Delete rules failed: ' + delErr.message }, { status: 500 })

      const activeRules = availability_rules.filter((r: any) => r.is_active)
      if (activeRules.length) {
        const { error: insErr } = await supabase.from('availability_rules').insert(
          activeRules.map((r: any) => ({
            staff_id: params.id,
            business_id: business.id,
            day_of_week: r.day_of_week,
            start_time: r.start_time,
            end_time: r.end_time,
            is_active: true,
          }))
        )
        if (insErr) return NextResponse.json({ error: 'Insert rules failed: ' + insErr.message }, { status: 500 })
      }
    }

    if (service_ids && Array.isArray(service_ids)) {
      await supabase.from('staff_services').delete().eq('staff_id', params.id)
      if (service_ids.length) {
        await supabase.from('staff_services').insert(
          service_ids.map((sid: string) => ({ staff_id: params.id, service_id: sid }))
        )
      }
    }

    return NextResponse.json({ staff: data })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unexpected error: ' + e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const { data: business } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('staff').update({ is_active: false }).eq('id', params.id).eq('business_id', business.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
