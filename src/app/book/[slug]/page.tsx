// ============================================================
// /book/[slug] — Public Booking Page
// ============================================================
import { notFound } from 'next/navigation'
import { BookingFlow } from '@/components/booking/BookingFlow'
import type { BookingPageData } from '@/types'
import type { Metadata } from 'next'

async function getBookingPageData(slug: string): Promise<BookingPageData | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/booking-page/${slug}`,
      { next: { revalidate: 60 } }  // cache for 60s
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const data = await getBookingPageData(params.slug)
  if (!data) return { title: 'Booking' }
  return {
    title: `Book with ${data.business.name}`,
    description: `Book an appointment with ${data.business.name} online.`,
  }
}

export default async function BookPage({ params }: { params: { slug: string } }) {
  const data = await getBookingPageData(params.slug)
  if (!data) notFound()

  return (
    <main
      className="min-h-screen booking-page"
      style={{ '--accent': data.business.color_accent } as React.CSSProperties}
    >
      <BookingFlow data={data} />
    </main>
  )
}
