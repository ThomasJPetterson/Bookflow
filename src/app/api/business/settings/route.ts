import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helper'

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const { data, error } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ business: data })
}

export async function PUT(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const body = await req.json()
  const { data, error } = await supabase
    .from('businesses').update(body).eq('owner_id', user.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ business: data })
}
