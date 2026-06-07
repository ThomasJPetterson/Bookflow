// ============================================================
// /api/bookings/[id] — Update booking status
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helper'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const { data: business } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, cancel_reason } = body

  const validStatuses = ['confirmed', 'completed', 'cancelled', 'no_show']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updatePayload: any = { status }
  if (status === 'cancelled') {
    updatePayload.cancelled_at = new Date().toISOString()
    updatePayload.cancel_reason = cancel_reason
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', params.id)
    .eq('business_id', business.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ booking: data })
}
