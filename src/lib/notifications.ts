// ============================================================
// BOOKFLOW — Notification System (Resend API)
// ============================================================
import type { Booking, Business, Service, Staff } from '@/types'

function formatDateTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: timezone,
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function clientConfirmationHtml(booking: Booking, business: Business, service: Service, staff: Staff): string {
  const dateStr = formatDateTime(booking.starts_at, business.timezone ?? 'Europe/London')
  const accent = business.color_accent ?? '#6366f1'
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:40px 20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.06);">
    <div style="background:${accent};padding:32px 40px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Booking Confirmed ✓</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;">Ref: <strong>${booking.booking_ref}</strong></p>
    </div>
    <div style="padding:32px 40px;">
      <p style="font-size:16px;color:#374151;">Hi <strong>${booking.client_name}</strong>,</p>
      <p style="color:#6b7280;">Your appointment at <strong>${business.name}</strong> is confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#9ca3af;font-size:14px;">Service</td>
            <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">${service.name}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#9ca3af;font-size:14px;">Date & Time</td>
            <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">${dateStr}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#9ca3af;font-size:14px;">With</td>
            <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">${staff.name}</td></tr>
        <tr><td style="padding:10px 0;color:#9ca3af;font-size:14px;">Duration</td>
            <td style="padding:10px 0;font-weight:600;">${service.duration_mins} mins</td></tr>
      </table>
      ${(service as any).price ? `<p style="font-size:18px;font-weight:700;color:${accent};">£${Number((service as any).price).toFixed(2)}</p>` : ''}
      <p style="color:#6b7280;font-size:14px;margin-top:24px;">Need to cancel? Contact ${business.email}.</p>
    </div>
    <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f3f4f6;">
      <p style="color:#9ca3af;font-size:13px;margin:0;">${business.name} · ${business.email}</p>
    </div>
  </div></body></html>`
}

function businessNotificationHtml(booking: Booking, business: Business, service: Service, staff: Staff): string {
  const dateStr = formatDateTime(booking.starts_at, business.timezone ?? 'Europe/London')
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:40px 20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,.06);">
    <h2 style="margin-top:0;">📅 New Booking — ${booking.booking_ref}</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;">Client</td>
          <td style="padding:8px 0;font-weight:600;">${booking.client_name}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Email</td>
          <td style="padding:8px 0;">${booking.client_email}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Service</td>
          <td style="padding:8px 0;font-weight:600;">${service.name}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Staff</td>
          <td style="padding:8px 0;">${staff.name}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Date/Time</td>
          <td style="padding:8px 0;font-weight:600;">${dateStr}</td></tr>
    </table>
  </div></body></html>`
}

export interface NotificationPayload {
  booking: Booking
  business: Business
  service: Service
  staff: Staff
}

async function sendViaResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping email')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BookFlow <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
  }
}

export async function sendBookingNotifications(payload: NotificationPayload) {
  const { booking, business, service, staff } = payload

  await Promise.allSettled([
    sendViaResend(
      booking.client_email,
      `Booking Confirmed — ${service.name} at ${business.name}`,
      clientConfirmationHtml(booking, business, service, staff)
    ),
    sendViaResend(
      business.email,
      `New Booking: ${booking.client_name} — ${service.name}`,
      businessNotificationHtml(booking, business, service, staff)
    ),
  ])
}
