import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helper'

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const { data: business } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'No business found' }, { status: 404 })

  const { data, error } = await supabase
    .from('services').select('*').eq('business_id', business.id).order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ services: data })
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const { data: business } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'No business found' }, { status: 404 })

  const body = await req.json()
  const { name, description, duration_mins, price, color } = body

  if (!name?.trim() || !duration_mins) {
    return NextResponse.json({ error: 'Name and duration are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('services')
    .insert({
      business_id: business.id,
      name: name.trim(),
      description,
      duration_mins: Number(duration_mins),
      price: price ? Number(price) : null,
      color: color ?? '#6366f1',
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const { data: business } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...fields } = body

  const { data, error } = await supabase
    .from('services').update(fields).eq('id', id).eq('business_id', business.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data })
}
