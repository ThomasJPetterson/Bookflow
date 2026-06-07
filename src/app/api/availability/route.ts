// ============================================================
// GET /api/availability
// Query: business_id, staff_id, service_id, date (YYYY-MM-DD)
// Returns available time slots
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAvailableSlots } from '@/lib/availability'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const business_id = searchParams.get('business_id')
  const staff_id    = searchParams.get('staff_id')
  const service_id  = searchParams.get('service_id')
  const date        = searchParams.get('date')

  if (!business_id || !staff_id || !service_id || !date) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  // Fetch service duration
  const { data: service, error: svcErr } = await supabase
    .from('services')
    .select('duration_mins')
    .eq('id', service_id)
    .eq('business_id', business_id)
    .single()

  if (svcErr || !service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  // Fetch business timezone
  const { data: business } = await supabase
    .from('businesses')
    .select('timezone')
    .eq('id', business_id)
    .single()

  // Fetch staff availability rules
  const { data: rules } = await supabase
    .from('availability_rules')
    .select('*')
    .eq('staff_id', staff_id)
    .eq('is_active', true)

  // Fetch existing bookings for staff on that date
  const dayStart = new Date(date + 'T00:00:00Z').toISOString()
  const dayEnd   = new Date(date + 'T23:59:59Z').toISOString()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('staff_id', staff_id)
    .neq('status', 'cancelled')
    .gte('starts_at', dayStart)
    .lte('starts_at', dayEnd)

  const slots = generateAvailableSlots(
    date,
    service.duration_mins,
    rules ?? [],
    bookings ?? [],
    business?.timezone ?? 'Europe/London'
  )

  return NextResponse.json({ slots })
}
