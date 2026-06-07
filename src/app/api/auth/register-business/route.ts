// ============================================================
// POST /api/auth/register-business
// Registers a new business owner + creates tenant record
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, password, business_name, timezone = 'Europe/London' } = body

  if (!email || !password || !business_name) {
    return NextResponse.json(
      { error: 'Email, password, and business name are required' },
      { status: 400 }
    )
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,  // skip email verification for MVP
  })

  if (authError) {
    if (authError.message?.includes('already registered')) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const userId = authData.user.id

  // Generate unique slug
  let slug = generateSlug(business_name)
  const { data: existing } = await supabase
    .from('businesses')
    .select('slug')
    .like('slug', `${slug}%`)

  if (existing && existing.length > 0) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  }

  // Create business record
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .insert({
      name:     business_name.trim(),
      slug,
      email,
      timezone,
      owner_id: userId,
    })
    .select()
    .single()

  if (bizError) {
    // Rollback user creation
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: bizError.message }, { status: 500 })
  }

  // Create a default "Owner" staff record for them
  await supabase.from('staff').insert({
    business_id: business.id,
    name: business_name.trim() + ' Team',
    role: 'owner',
  })

  return NextResponse.json({
    message: 'Business registered successfully',
    slug:    business.slug,
    business_id: business.id,
  }, { status: 201 })
}
