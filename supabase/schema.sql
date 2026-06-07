-- ============================================================
-- BOOKFLOW — Multi-Tenant Booking SaaS
-- Supabase PostgreSQL Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BUSINESSES (Tenants)
-- ============================================================
CREATE TABLE businesses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,         -- used for /book/{slug}
  email         TEXT NOT NULL,
  phone         TEXT,
  address       TEXT,
  timezone      TEXT NOT NULL DEFAULT 'Europe/London',
  logo_url      TEXT,
  color_accent  TEXT DEFAULT '#6366f1',       -- brand color for booking page
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_businesses_slug  ON businesses(slug);

-- ============================================================
-- STAFF
-- ============================================================
CREATE TABLE staff (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT,
  role          TEXT DEFAULT 'staff',         -- 'owner' | 'staff'
  avatar_url    TEXT,
  bio           TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_business ON staff(business_id);

-- ============================================================
-- AVAILABILITY RULES (weekly recurring schedule per staff)
-- ============================================================
CREATE TABLE availability_rules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id      UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun 6=Sat
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (staff_id, day_of_week)
);

CREATE INDEX idx_availability_staff    ON availability_rules(staff_id);
CREATE INDEX idx_availability_business ON availability_rules(business_id);

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE services (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  duration_mins INTEGER NOT NULL DEFAULT 60,
  price         NUMERIC(10,2),
  color         TEXT DEFAULT '#6366f1',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_business ON services(business_id);

-- Junction: which staff offer which services
CREATE TABLE staff_services (
  staff_id      UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id    UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id      UUID NOT NULL REFERENCES services(id),
  staff_id        UUID NOT NULL REFERENCES staff(id),
  -- Client info (no account needed)
  client_name     TEXT NOT NULL,
  client_email    TEXT NOT NULL,
  client_phone    TEXT,
  client_notes    TEXT,
  -- Timing
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  -- Status
  status          TEXT NOT NULL DEFAULT 'confirmed'
                  CHECK (status IN ('confirmed','cancelled','completed','no_show')),
  -- Metadata
  booking_ref     TEXT NOT NULL UNIQUE DEFAULT UPPER(SUBSTRING(uuid_generate_v4()::TEXT, 1, 8)),
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_business    ON bookings(business_id);
CREATE INDEX idx_bookings_staff       ON bookings(staff_id);
CREATE INDEX idx_bookings_starts_at   ON bookings(starts_at);
CREATE INDEX idx_bookings_status      ON bookings(status);

-- ============================================================
-- CONFLICT PREVENTION: Exclude overlapping bookings per staff
-- Uses PostgreSQL EXCLUDE constraint (requires btree_gist)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD CONSTRAINT no_double_booking
  EXCLUDE USING GIST (
    staff_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status NOT IN ('cancelled'));

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE businesses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff              ENABLE ROW LEVEL SECURITY;
ALTER TABLE services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services     ENABLE ROW LEVEL SECURITY;

-- Helper: get business_id for the current user
CREATE OR REPLACE FUNCTION get_my_business_id()
RETURNS UUID AS $$
  SELECT id FROM businesses WHERE owner_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- BUSINESSES: owner reads/writes their own
CREATE POLICY "owner_all"   ON businesses FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "public_read" ON businesses FOR SELECT
  USING (TRUE);                          -- needed for /book/{slug} page

-- STAFF: owner manages; public can read (for booking page)
CREATE POLICY "owner_manage" ON staff FOR ALL
  USING (business_id = get_my_business_id());

CREATE POLICY "public_read"  ON staff FOR SELECT
  USING (TRUE);

-- SERVICES: same pattern
CREATE POLICY "owner_manage" ON services FOR ALL
  USING (business_id = get_my_business_id());

CREATE POLICY "public_read"  ON services FOR SELECT
  USING (TRUE);

-- AVAILABILITY_RULES
CREATE POLICY "owner_manage" ON availability_rules FOR ALL
  USING (business_id = get_my_business_id());

CREATE POLICY "public_read"  ON availability_rules FOR SELECT
  USING (TRUE);

-- BOOKINGS: owner sees all in their biz; public can INSERT only
CREATE POLICY "owner_all"    ON bookings FOR ALL
  USING (business_id = get_my_business_id());

CREATE POLICY "public_insert" ON bookings FOR INSERT
  WITH CHECK (TRUE);

-- STAFF_SERVICES
CREATE POLICY "owner_manage" ON staff_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = staff_services.staff_id
        AND s.business_id = get_my_business_id()
    )
  );

CREATE POLICY "public_read"  ON staff_services FOR SELECT
  USING (TRUE);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED DATA: 2 Demo Businesses
-- NOTE: Replace the owner_id UUIDs with real auth.users IDs after signup
-- ============================================================

-- Business 1: Luxe Beauty Studio
INSERT INTO businesses (id, name, slug, email, phone, timezone, color_accent, owner_id) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Luxe Beauty Studio', 'luxe-beauty',
   'hello@luxebeauty.com', '+44 20 1234 5678', 'Europe/London', '#ec4899',
   '00000000-0000-0000-0000-000000000001');  -- replace with real owner_id

-- Business 2: Elite Barbershop
INSERT INTO businesses (id, name, slug, email, phone, timezone, color_accent, owner_id) VALUES
  ('22222222-0000-0000-0000-000000000002', 'Elite Barbershop', 'elite-barbers',
   'book@elitebarbers.com', '+44 20 9876 5432', 'Europe/London', '#0ea5e9',
   '00000000-0000-0000-0000-000000000002');  -- replace with real owner_id

-- Staff for Luxe Beauty
INSERT INTO staff (id, business_id, name, email) VALUES
  ('aaaa0001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Sophie Laurent', 'sophie@luxebeauty.com'),
  ('aaaa0002-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Mia Chen', 'mia@luxebeauty.com'),
  ('aaaa0003-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Priya Sharma', 'priya@luxebeauty.com');

-- Staff for Elite Barbers
INSERT INTO staff (id, business_id, name, email) VALUES
  ('bbbb0001-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Marcus Davis', 'marcus@elitebarbers.com'),
  ('bbbb0002-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'James Wright', 'james@elitebarbers.com');

-- Services for Luxe Beauty
INSERT INTO services (id, business_id, name, duration_mins, price, color) VALUES
  ('cccc0001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Classic Manicure', 45, 35.00, '#ec4899'),
  ('cccc0002-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Gel Nails', 75, 55.00, '#a855f7'),
  ('cccc0003-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Pedicure', 60, 45.00, '#f43f5e'),
  ('cccc0004-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Full Set Acrylics', 90, 75.00, '#8b5cf6');

-- Services for Elite Barbers
INSERT INTO services (id, business_id, name, duration_mins, price, color) VALUES
  ('dddd0001-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Haircut', 30, 25.00, '#0ea5e9'),
  ('dddd0002-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Beard Trim', 20, 15.00, '#06b6d4'),
  ('dddd0003-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Cut & Beard', 50, 35.00, '#3b82f6'),
  ('dddd0004-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Hot Towel Shave', 40, 30.00, '#1d4ed8');

-- Availability: Mon-Fri 9am-6pm for Luxe Beauty staff
INSERT INTO availability_rules (business_id, staff_id, day_of_week, start_time, end_time) VALUES
  ('11111111-0000-0000-0000-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 1, '09:00', '18:00'),
  ('11111111-0000-0000-0000-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 2, '09:00', '18:00'),
  ('11111111-0000-0000-0000-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 3, '09:00', '18:00'),
  ('11111111-0000-0000-0000-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 4, '09:00', '18:00'),
  ('11111111-0000-0000-0000-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 5, '09:00', '18:00'),
  ('11111111-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000001', 1, '10:00', '19:00'),
  ('11111111-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000001', 2, '10:00', '19:00'),
  ('11111111-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000001', 3, '10:00', '19:00'),
  ('11111111-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000001', 4, '10:00', '19:00'),
  ('11111111-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000001', 5, '10:00', '19:00'),
  -- Saturdays for Sophie and Mia
  ('11111111-0000-0000-0000-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 6, '09:00', '16:00'),
  ('11111111-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000001', 6, '09:00', '16:00');

-- Availability for Elite Barbers: Mon-Sat
INSERT INTO availability_rules (business_id, staff_id, day_of_week, start_time, end_time) VALUES
  ('22222222-0000-0000-0000-000000000002', 'bbbb0001-0000-0000-0000-000000000002', 1, '09:00', '18:00'),
  ('22222222-0000-0000-0000-000000000002', 'bbbb0001-0000-0000-0000-000000000002', 2, '09:00', '18:00'),
  ('22222222-0000-0000-0000-000000000002', 'bbbb0001-0000-0000-0000-000000000002', 3, '09:00', '18:00'),
  ('22222222-0000-0000-0000-000000000002', 'bbbb0001-0000-0000-0000-000000000002', 4, '09:00', '18:00'),
  ('22222222-0000-0000-0000-000000000002', 'bbbb0001-0000-0000-0000-000000000002', 5, '09:00', '18:00'),
  ('22222222-0000-0000-0000-000000000002', 'bbbb0001-0000-0000-0000-000000000002', 6, '09:00', '17:00'),
  ('22222222-0000-0000-0000-000000000002', 'bbbb0002-0000-0000-0000-000000000002', 2, '11:00', '19:00'),
  ('22222222-0000-0000-0000-000000000002', 'bbbb0002-0000-0000-0000-000000000002', 3, '11:00', '19:00'),
  ('22222222-0000-0000-0000-000000000002', 'bbbb0002-0000-0000-0000-000000000002', 4, '11:00', '19:00'),
  ('22222222-0000-0000-0000-000000000002', 'bbbb0002-0000-0000-0000-000000000002', 5, '11:00', '19:00'),
  ('22222222-0000-0000-0000-000000000002', 'bbbb0002-0000-0000-0000-000000000002', 6, '10:00', '17:00');

-- Staff-Service assignments (all Luxe staff do all Luxe services)
INSERT INTO staff_services VALUES
  ('aaaa0001-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001'),
  ('aaaa0001-0000-0000-0000-000000000001', 'cccc0002-0000-0000-0000-000000000001'),
  ('aaaa0001-0000-0000-0000-000000000001', 'cccc0003-0000-0000-0000-000000000001'),
  ('aaaa0001-0000-0000-0000-000000000001', 'cccc0004-0000-0000-0000-000000000001'),
  ('aaaa0002-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001'),
  ('aaaa0002-0000-0000-0000-000000000001', 'cccc0002-0000-0000-0000-000000000001'),
  ('aaaa0002-0000-0000-0000-000000000001', 'cccc0003-0000-0000-0000-000000000001'),
  ('aaaa0002-0000-0000-0000-000000000001', 'cccc0004-0000-0000-0000-000000000001'),
  ('aaaa0003-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001'),
  ('aaaa0003-0000-0000-0000-000000000001', 'cccc0003-0000-0000-0000-000000000001');

-- Barbers do all barber services
INSERT INTO staff_services VALUES
  ('bbbb0001-0000-0000-0000-000000000002', 'dddd0001-0000-0000-0000-000000000002'),
  ('bbbb0001-0000-0000-0000-000000000002', 'dddd0002-0000-0000-0000-000000000002'),
  ('bbbb0001-0000-0000-0000-000000000002', 'dddd0003-0000-0000-0000-000000000002'),
  ('bbbb0001-0000-0000-0000-000000000002', 'dddd0004-0000-0000-0000-000000000002'),
  ('bbbb0002-0000-0000-0000-000000000002', 'dddd0001-0000-0000-0000-000000000002'),
  ('bbbb0002-0000-0000-0000-000000000002', 'dddd0002-0000-0000-0000-000000000002'),
  ('bbbb0002-0000-0000-0000-000000000002', 'dddd0003-0000-0000-0000-000000000002');
