-- ============================================================
-- Fix RLS policies for all tables
-- ============================================================

-- SERVICES
DROP POLICY IF EXISTS "Business owners can manage services" ON services;
DROP POLICY IF EXISTS "Services are viewable by business owner" ON services;
DROP POLICY IF EXISTS "Services are insertable by business owner" ON services;
DROP POLICY IF EXISTS "Services are updatable by business owner" ON services;
DROP POLICY IF EXISTS "Services are deletable by business owner" ON services;
DROP POLICY IF EXISTS "owner_select_services" ON services;
DROP POLICY IF EXISTS "owner_insert_services" ON services;
DROP POLICY IF EXISTS "owner_update_services" ON services;
DROP POLICY IF EXISTS "owner_delete_services" ON services;
DROP POLICY IF EXISTS "Public can view services" ON services;

CREATE POLICY "services_select" ON services FOR SELECT USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  OR business_id IN (SELECT id FROM businesses)
);
CREATE POLICY "services_insert" ON services FOR INSERT WITH CHECK (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "services_update" ON services FOR UPDATE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "services_delete" ON services FOR DELETE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);

-- STAFF
DROP POLICY IF EXISTS "Business owners can manage staff" ON staff;
DROP POLICY IF EXISTS "Staff are viewable by business owner" ON staff;
DROP POLICY IF EXISTS "owner_select_staff" ON staff;
DROP POLICY IF EXISTS "owner_insert_staff" ON staff;
DROP POLICY IF EXISTS "owner_update_staff" ON staff;
DROP POLICY IF EXISTS "owner_delete_staff" ON staff;
DROP POLICY IF EXISTS "Public can view staff" ON staff;

CREATE POLICY "staff_select" ON staff FOR SELECT USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  OR business_id IN (SELECT id FROM businesses)
);
CREATE POLICY "staff_insert" ON staff FOR INSERT WITH CHECK (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "staff_update" ON staff FOR UPDATE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "staff_delete" ON staff FOR DELETE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);

-- AVAILABILITY RULES
DROP POLICY IF EXISTS "Business owners can manage availability" ON availability_rules;
DROP POLICY IF EXISTS "owner_select_availability" ON availability_rules;
DROP POLICY IF EXISTS "owner_insert_availability" ON availability_rules;
DROP POLICY IF EXISTS "owner_update_availability" ON availability_rules;
DROP POLICY IF EXISTS "owner_delete_availability" ON availability_rules;

CREATE POLICY "availability_select" ON availability_rules FOR SELECT USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  OR business_id IN (SELECT id FROM businesses)
);
CREATE POLICY "availability_insert" ON availability_rules FOR INSERT WITH CHECK (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "availability_update" ON availability_rules FOR UPDATE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "availability_delete" ON availability_rules FOR DELETE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);

-- STAFF SERVICES
DROP POLICY IF EXISTS "Business owners can manage staff services" ON staff_services;
DROP POLICY IF EXISTS "owner_select_staff_services" ON staff_services;
DROP POLICY IF EXISTS "owner_insert_staff_services" ON staff_services;
DROP POLICY IF EXISTS "owner_delete_staff_services" ON staff_services;

CREATE POLICY "staff_services_select" ON staff_services FOR SELECT USING (true);
CREATE POLICY "staff_services_insert" ON staff_services FOR INSERT WITH CHECK (
  staff_id IN (SELECT id FROM staff WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
);
CREATE POLICY "staff_services_delete" ON staff_services FOR DELETE USING (
  staff_id IN (SELECT id FROM staff WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
);

-- BOOKINGS
DROP POLICY IF EXISTS "Business owners can manage bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
DROP POLICY IF EXISTS "owner_select_bookings" ON bookings;
DROP POLICY IF EXISTS "owner_update_bookings" ON bookings;
DROP POLICY IF EXISTS "public_insert_bookings" ON bookings;

CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);

-- BUSINESSES
DROP POLICY IF EXISTS "Business owners can manage their business" ON businesses;
DROP POLICY IF EXISTS "owner_select_businesses" ON businesses;
DROP POLICY IF EXISTS "owner_update_businesses" ON businesses;

CREATE POLICY "businesses_select" ON businesses FOR SELECT USING (
  owner_id = auth.uid()
);
CREATE POLICY "businesses_insert" ON businesses FOR INSERT WITH CHECK (
  owner_id = auth.uid()
);
CREATE POLICY "businesses_update" ON businesses FOR UPDATE USING (
  owner_id = auth.uid()
);
