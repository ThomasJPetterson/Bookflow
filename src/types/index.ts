// ============================================================
// BOOKFLOW — TypeScript Types
// ============================================================

export type Business = {
  id: string
  name: string
  slug: string
  email: string
  phone?: string
  address?: string
  timezone: string
  logo_url?: string
  color_accent: string
  owner_id: string
  created_at: string
  updated_at: string
}

export type Staff = {
  id: string
  business_id: string
  name: string
  email?: string
  role: 'owner' | 'staff'
  avatar_url?: string
  bio?: string
  is_active: boolean
  created_at: string
}

export type Service = {
  id: string
  business_id: string
  name: string
  description?: string
  duration_mins: number
  price?: number
  color: string
  is_active: boolean
  created_at: string
}

export type AvailabilityRule = {
  id: string
  business_id: string
  staff_id: string
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6
  start_time: string  // HH:MM
  end_time: string    // HH:MM
  is_active: boolean
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export type Booking = {
  id: string
  business_id: string
  service_id: string
  staff_id: string
  client_name: string
  client_email: string
  client_phone?: string
  client_notes?: string
  starts_at: string  // ISO string
  ends_at: string    // ISO string
  status: BookingStatus
  booking_ref: string
  cancelled_at?: string
  cancel_reason?: string
  created_at: string
  updated_at: string
  // Joined
  service?: Service
  staff?: Staff
}

export type StaffService = {
  staff_id: string
  service_id: string
}

// ============================================================
// API / UI Types
// ============================================================

export type TimeSlot = {
  starts_at: string   // ISO string
  ends_at: string     // ISO string
  label: string       // e.g. "09:00"
  available: boolean
}

export type CreateBookingPayload = {
  business_id: string
  service_id: string
  staff_id: string
  starts_at: string
  ends_at: string
  client_name: string
  client_email: string
  client_phone?: string
  client_notes?: string
}

export type BookingPageData = {
  business: Business
  services: Service[]
  staff: (Staff & { services: string[] })[]
}

export type DashboardStats = {
  totalBookings: number
  todayBookings: number
  weekBookings: number
  revenue: number
}

export type ApiError = {
  error: string
  details?: string
}
