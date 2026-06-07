'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (!biz) {
        router.push('/auth/register')
        return
      }

      setBusiness(biz)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <DashboardSidebar business={business} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px', maxWidth: 'calc(100vw - 260px)' }}>
        {children}
      </main>
    </div>
  )
}
