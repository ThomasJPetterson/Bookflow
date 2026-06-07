import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BookFlow — Online Booking for Your Business',
  description: 'Multi-tenant online booking platform. Get your own booking page in minutes.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
