import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) return null

  // Create client with the user's token set as the auth header
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  return { user, supabase }
}
