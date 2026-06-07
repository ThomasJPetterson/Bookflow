# BookFlow — Deployment & Architecture Guide

## 🏗️ Architecture Overview

### Multi-Tenant Design

```
                    ┌─────────────────────────────────┐
                    │         BOOKFLOW SAAS           │
                    └─────────────────────────────────┘
                           │                │
              ┌────────────┘                └────────────┐
              ▼                                          ▼
    ┌──────────────────┐                    ┌──────────────────┐
    │  Luxe Beauty     │                    │  Elite Barbers   │
    │  /book/luxe-     │                    │  /book/elite-    │
    │  beauty          │                    │  barbers         │
    │  business_id: A  │                    │  business_id: B  │
    └──────────────────┘                    └──────────────────┘
           │                                        │
    staff / services / bookings         staff / services / bookings
    ALL filtered by business_id A       ALL filtered by business_id B
```

**Tenant isolation is enforced at 3 layers:**
1. **Application layer** — Every API route fetches `business_id` from the authenticated user, then filters all queries with `eq('business_id', business.id)`
2. **Database layer** — Row Level Security (RLS) policies use `get_my_business_id()` to ensure queries only return rows belonging to the authenticated owner's business
3. **Constraint layer** — The `EXCLUDE` constraint on `bookings` prevents double-booking at the PostgreSQL level, even under race conditions

---

## 📊 Data Flow: Booking System

```
Client visits /book/luxe-beauty
        │
        ▼
GET /api/booking-page/luxe-beauty
        │
        ▼
Returns: { business, services[], staff[] }
        │
        ▼
Client selects: Service → Staff → Date
        │
        ▼
GET /api/availability?business_id=X&staff_id=Y&service_id=Z&date=2025-06-10
        │
        ▼
Server:
  1. Load availability_rules for staff on that day-of-week
  2. Generate all possible slots (every 15 mins within working hours)
  3. Load existing bookings for staff on that date
  4. Remove conflicting slots
  5. Remove past slots
  6. Return available slots[]
        │
        ▼
Client selects slot → enters details
        │
        ▼
POST /api/bookings { business_id, service_id, staff_id, starts_at, ends_at, client_... }
        │
        ▼
Server:
  1. Validate all IDs belong to same business
  2. Validate duration matches service
  3. INSERT into bookings
     └─ PostgreSQL EXCLUDE constraint fires if overlap exists
     └─ Returns 409 if time slot was just taken (race condition safe)
  4. Send email notifications (non-blocking)
  5. Return { booking_ref, starts_at, ... }
```

---

## 🚀 Deployment: Vercel + Supabase (Free Tier)

### Step 1: Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **API Keys** (Settings → API)
3. Go to **SQL Editor** and run `supabase/schema.sql`
4. Enable email auth: Authentication → Providers → Email (turn off "Confirm email" for MVP)

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Clone and deploy
git clone your-repo
cd bookflow
npm install
vercel
```

Or connect GitHub repo at [vercel.com](https://vercel.com/new).

### Step 3: Set Environment Variables in Vercel

In Vercel dashboard → Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJ...
SUPABASE_SERVICE_ROLE_KEY       = eyJ...
NEXT_PUBLIC_APP_URL             = https://yourapp.vercel.app
SMTP_HOST                       = smtp.gmail.com
SMTP_PORT                       = 587
SMTP_SECURE                     = false
SMTP_USER                       = youremail@gmail.com
SMTP_PASS                       = your_app_password
```

### Step 4: Update Supabase Auth Redirect

In Supabase → Authentication → URL Configuration:
- **Site URL**: `https://yourapp.vercel.app`
- **Redirect URLs**: `https://yourapp.vercel.app/**`

### Step 5: Test the Flow

1. Go to `https://yourapp.vercel.app/auth/register`
2. Create a business account
3. Add staff and services in the dashboard
4. Visit your booking page at `/book/your-slug`
5. Complete a test booking

---

## 📁 Project Structure

```
bookflow/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── book/
│   │   │   └── [slug]/page.tsx         # Public booking page
│   │   ├── dashboard/
│   │   │   ├── layout.tsx              # Auth guard + sidebar
│   │   │   ├── page.tsx                # Overview/stats
│   │   │   ├── bookings/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── staff/page.tsx
│   │   │   ├── services/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── auth/register-business/route.ts
│   │       ├── availability/route.ts
│   │       ├── bookings/
│   │       │   ├── route.ts            # GET (list) + POST (create)
│   │       │   └── [id]/route.ts       # PATCH (status update)
│   │       ├── staff/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── services/route.ts
│   │       ├── booking-page/[slug]/route.ts
│   │       ├── business/settings/route.ts
│   │       └── dashboard/stats/route.ts
│   ├── components/
│   │   ├── booking/
│   │   │   └── BookingFlow.tsx         # Full booking wizard
│   │   └── dashboard/
│   │       └── DashboardSidebar.tsx
│   ├── lib/
│   │   ├── supabase.ts                 # Client/server/admin clients
│   │   ├── availability.ts             # Slot generation engine
│   │   └── notifications.ts           # Email/SMS (modular)
│   └── types/
│       └── index.ts                    # All TypeScript types
├── supabase/
│   └── schema.sql                      # Full DB schema + seed data
└── docs/
    └── DEPLOYMENT.md                   # This file
```

---

## 🔐 Security Notes

- **RLS is enforced** — even direct DB access respects tenant boundaries
- **Service role key** is only used server-side in `createAdminClient()` — never exposed to browser
- **Double-booking** prevented at DB level via PostgreSQL EXCLUDE constraint (handles race conditions)
- **Cross-tenant access** is impossible — API routes always scope queries to the authenticated user's `business_id`
- **Client data** — clients don't need accounts, their data is scoped to the business

---

## 📈 Scaling Roadmap

### Phase 1 — Now (MVP)
- ✅ Multi-tenant core
- ✅ Booking system with conflict prevention
- ✅ Staff + services + calendar
- ✅ Email notifications
- ✅ Free tier deployment

### Phase 2 — Growth ($0–$1K MRR)
- [ ] **Stripe subscriptions** — charge businesses monthly (Basic/Pro/Business plans)
- [ ] **Custom domains** — `book.yourbusiness.com` via CNAME → Vercel
- [ ] **Booking reminders** — 24h/1h before appointment (cron job via Vercel + Supabase Edge Functions)
- [ ] **SMS via Twilio** — swap in `notifications.ts` (stub already exists)
- [ ] **Google Calendar sync** — OAuth, push confirmed bookings
- [ ] **Buffer time** between appointments
- [ ] **Max daily bookings** cap per staff

### Phase 3 — Scale ($1K–$10K MRR)
- [ ] **White-label** — remove BookFlow branding for paid plans
- [ ] **Cancellation self-serve** — clients cancel via booking ref link
- [ ] **Deposits** — charge a deposit at booking time via Stripe
- [ ] **Waiting list** — when full, queue clients
- [ ] **Multi-location** — one business, multiple venues
- [ ] **Reviews** — post-appointment review requests

### Phase 4 — Enterprise ($10K+ MRR)
- [ ] **Team accounts** — multiple owners per business
- [ ] **Analytics dashboard** — revenue, retention, peak hours
- [ ] **API webhooks** — businesses can receive booking events
- [ ] **Mobile app** — React Native for staff dashboard
- [ ] **Migrate to dedicated DB** per large tenant (tenant isolation → tenant DBs)

---

## 💡 SaaS Pricing Suggestion

| Plan     | Price  | Limits                          |
|----------|--------|---------------------------------|
| Starter  | Free   | 50 bookings/mo, 1 staff         |
| Growth   | £19/mo | Unlimited bookings, 5 staff     |
| Pro      | £49/mo | Unlimited everything, custom domain, SMS |
| Business | £149/mo | White-label, API access, priority support |

Implement via: Stripe Billing → webhook updates a `plan` field on `businesses` table → middleware checks plan limits.
