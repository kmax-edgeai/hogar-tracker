-- ============================================================
-- HogarTracker – Supabase Database Schema
-- Ejecuta este SQL en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────
-- HOUSEHOLDS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS households (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(uuid_generate_v4()::text, 1, 8)),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- PROFILES (one per auth user)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  full_name    TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- CATEGORIES
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#6366f1',
  icon         TEXT NOT NULL DEFAULT 'tag',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (household_id, name)
);

-- ────────────────────────────────────────────────
-- EXPENSES
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  item           TEXT NOT NULL,
  establishment  TEXT NOT NULL DEFAULT '',
  description    TEXT,
  currency       TEXT NOT NULL DEFAULT 'USD',
  amount         NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  expense_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url    TEXT,                        -- storage path in bucket "receipts"
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────
-- BUDGETS (monthly, per category)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  currency     TEXT NOT NULL DEFAULT 'USD',
  amount       NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  month        DATE NOT NULL,              -- stored as first day of month
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (household_id, category_id, currency, month)
);

-- ────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────

ALTER TABLE households   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets      ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's household_id
CREATE OR REPLACE FUNCTION my_household_id()
RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT household_id FROM profiles WHERE id = auth.uid();
$$;

-- HOUSEHOLDS
CREATE POLICY "Users can view their household"
  ON households FOR SELECT
  USING (id = my_household_id());

CREATE POLICY "Users can insert household"
  ON households FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Members can update their household"
  ON households FOR UPDATE
  USING (id = my_household_id());

-- PROFILES
CREATE POLICY "Users can view profiles in their household"
  ON profiles FOR SELECT
  USING (household_id = my_household_id() OR id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- CATEGORIES
CREATE POLICY "Household members can view categories"
  ON categories FOR SELECT
  USING (household_id = my_household_id());

CREATE POLICY "Household members can insert categories"
  ON categories FOR INSERT
  WITH CHECK (household_id = my_household_id());

CREATE POLICY "Household members can update categories"
  ON categories FOR UPDATE
  USING (household_id = my_household_id());

CREATE POLICY "Household members can delete categories"
  ON categories FOR DELETE
  USING (household_id = my_household_id());

-- EXPENSES
CREATE POLICY "Household members can view all expenses"
  ON expenses FOR SELECT
  USING (household_id = my_household_id());

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  WITH CHECK (user_id = auth.uid() AND household_id = my_household_id());

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  USING (user_id = auth.uid());

-- BUDGETS
CREATE POLICY "Household members can view budgets"
  ON budgets FOR SELECT
  USING (household_id = my_household_id());

CREATE POLICY "Household members can insert budgets"
  ON budgets FOR INSERT
  WITH CHECK (household_id = my_household_id());

CREATE POLICY "Household members can update budgets"
  ON budgets FOR UPDATE
  USING (household_id = my_household_id());

CREATE POLICY "Household members can delete budgets"
  ON budgets FOR DELETE
  USING (household_id = my_household_id());

-- ────────────────────────────────────────────────
-- STORAGE – bucket "receipts"
-- Run in Supabase SQL Editor AFTER creating the
-- bucket manually in Storage > New bucket (name: receipts, public: true)
-- ────────────────────────────────────────────────

-- Migration for existing deployments (safe to run even if column exists):
-- ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Storage RLS policies (execute in SQL Editor):
-- CREATE POLICY "Household members can upload receipts"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);

-- CREATE POLICY "Household members can read receipts"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);

-- CREATE POLICY "Users can delete own receipts"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────
-- TRIGGER: auto-create profile on signup
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
