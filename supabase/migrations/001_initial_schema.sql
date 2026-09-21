-- ============================================================================
-- Migration: 001_initial_schema.sql
-- RSCOE Student & Faculty Grievance Portal — Supabase (PostgreSQL 15)
--
-- Apply via: Supabase Dashboard → SQL Editor → paste & run
-- Or via CLI: supabase db push  (requires supabase CLI)
--
-- IMPORTANT: This schema is designed to work alongside Supabase Auth.
--   - auth.users is managed by Supabase. Our `users` table stores app-level
--     profile data and is linked to auth.users via id (UUID).
--   - RLS policies (in 002_rls_policies.sql) use auth.uid() to identify
--     the current user and auth.jwt() to read their role.
-- ============================================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('STUDENT', 'TEACHER', 'HEAD', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE complaint_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE complaint_status AS ENUM (
    'SUBMITTED',
    'UNDER_REVIEW',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED',
    'REJECTED',
    'ESCALATED',
    'REOPENED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reveal_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 1. Users (application profile, linked 1:1 with auth.users) ───────────────
--
-- id mirrors auth.users.id so that auth.uid() = users.id in RLS policies.
-- Password management is handled entirely by Supabase Auth; no password_hash here.
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT         NOT NULL UNIQUE,
  full_name     TEXT         NOT NULL,
  role          user_role    NOT NULL,
  department    TEXT         NOT NULL DEFAULT '',
  designation   TEXT,
  roll_number   TEXT,
  year          TEXT,
  division      TEXT,
  phone         TEXT,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS
  'Application-level user profiles. id = auth.users.id. Role drives RBAC.';

-- ── 2. Categories ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          SERIAL   PRIMARY KEY,
  name        TEXT     NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.categories IS
  'Complaint categories (Academics, Infrastructure, Finance & Fees, etc.)';

-- ── 3. Subcategories ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subcategories (
  id          SERIAL   PRIMARY KEY,
  category_id INTEGER  NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name        TEXT     NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, name)
);

-- ── 4. Complaints ─────────────────────────────────────────────────────────────
--
-- complainant_id → users(id)  [the person who filed the complaint]
-- assigned_to   → users(id)  [the investigator / HEAD assigned to resolve it]
-- category_id   → categories(id)
-- subcategory_id → subcategories(id)  [optional]
CREATE TABLE IF NOT EXISTS public.complaints (
  id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number TEXT              UNIQUE,        -- human-readable ref e.g. GRV-2026-0001
  title            TEXT              NOT NULL,
  description      TEXT              NOT NULL,

  -- Complainant (immutable once filed)
  complainant_id   UUID              NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_anonymous     BOOLEAN           NOT NULL DEFAULT FALSE,

  -- Classification
  category_id      INTEGER           NOT NULL REFERENCES public.categories(id),
  subcategory_id   INTEGER           REFERENCES public.subcategories(id),
  subcategory_name TEXT,             -- denormalised label, kept in sync with subcategories.name
  department       TEXT              NOT NULL DEFAULT '',  -- complainant's dept at filing time

  -- Triage
  priority         complaint_priority NOT NULL DEFAULT 'MEDIUM',
  status           complaint_status   NOT NULL DEFAULT 'SUBMITTED',

  -- Assignment
  assigned_to      UUID              REFERENCES public.users(id) ON DELETE SET NULL,

  -- Timestamps
  resolved_at      TIMESTAMPTZ,
  closed_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.complaints IS
  'Core grievance entity. complainant_id is masked in API responses when is_anonymous = TRUE '
  'unless the viewer holds an approved RevealRequest.';
COMMENT ON COLUMN public.complaints.is_anonymous IS
  'When TRUE, complainant_id is hidden from all roles except SUPER_ADMIN or a HEAD with an '
  'approved RevealRequest. Enforced at the application layer (RLS guards rows; column-level '
  'masking is done in API code via SanitizedComplaint).';

-- ── 5. Attachments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attachments (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID  NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  file_name    TEXT  NOT NULL,
  file_key     TEXT  NOT NULL,   -- Storage path (Supabase Storage or S3 key)
  file_type    TEXT  NOT NULL,
  file_size    BIGINT NOT NULL,
  uploaded_by  UUID  REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.attachments IS
  'File metadata for complaint attachments. Actual files stored in Supabase Storage / S3.';

-- ── 6. Comments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID    NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  author_id    UUID    NOT NULL REFERENCES public.users(id),
  content      TEXT    NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.comments IS
  'Threaded comments on a complaint. author_id is masked if is_anonymous = TRUE.';

-- ── 7. Complaint Assignments (history) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  assigned_by  UUID NOT NULL REFERENCES public.users(id),
  assigned_to  UUID NOT NULL REFERENCES public.users(id),
  notes        TEXT,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 8. Complaint Status History ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.complaint_status_history (
  id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID              NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  old_status   complaint_status,
  new_status   complaint_status  NOT NULL,
  changed_by   UUID              NOT NULL REFERENCES public.users(id),
  notes        TEXT,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. Reveal Requests ────────────────────────────────────────────────────────
--
-- A HEAD files a RevealRequest to ask SUPER_ADMIN to approve identity exposure
-- on an anonymous complaint.
--
-- requester_id → users(id)  [the HEAD who filed the request]
-- approver_id  → users(id)  [the SUPER_ADMIN who approved/rejected; NULL while PENDING]
-- complaint_id → complaints(id)
CREATE TABLE IF NOT EXISTS public.reveal_requests (
  id               UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id     UUID                  NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  requester_id     UUID                  NOT NULL REFERENCES public.users(id),
  reason           TEXT                  NOT NULL,
  status           reveal_request_status NOT NULL DEFAULT 'PENDING',
  approver_id      UUID                  REFERENCES public.users(id) ON DELETE SET NULL,
  approver_notes   TEXT,
  decided_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One pending request per complaint per HEAD at a time
  UNIQUE (complaint_id, requester_id, status) DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE public.reveal_requests IS
  'Formal requests by HEADs to expose the identity of an anonymous complainant. '
  'Must be approved by a SUPER_ADMIN before the identity can be accessed. '
  'Every successful reveal writes an immutable row to audit_logs.';

-- ── 10. Audit Logs (immutable) ────────────────────────────────────────────────
--
-- Every identity reveal, plus other sensitive system events, is recorded here.
-- Rows MUST NOT be updated or deleted — enforced by RLS in 002_rls_policies.sql.
--
-- actor_id     → users(id)   [who performed the action]
-- complaint_id → complaints(id) [which complaint was involved]
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id         UUID  REFERENCES public.users(id) ON DELETE SET NULL,
  action           TEXT  NOT NULL,    -- e.g. 'IDENTITY_REVEALED', 'STATUS_CHANGED'
  description      TEXT  NOT NULL,
  complaint_id     UUID  REFERENCES public.complaints(id) ON DELETE SET NULL,
  complainant_id   UUID  REFERENCES public.users(id) ON DELETE SET NULL,  -- for reveal events
  reveal_reason    TEXT,              -- reason provided by the actor during reveal
  metadata         JSONB,             -- flexible extra data (diff, old/new values, etc.)
  ip_address       TEXT,
  user_agent       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()

  -- No updated_at — this table is append-only.
);

COMMENT ON TABLE public.audit_logs IS
  'Immutable event log. UPDATE and DELETE are blocked by RLS. '
  'Every identity reveal writes one row here with actor, complainant, complaint, '
  'reason, timestamp, and client network info.';

-- ── 11. Notifications ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID              NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title        TEXT              NOT NULL,
  message      TEXT              NOT NULL,
  type         notification_type NOT NULL DEFAULT 'info',
  is_read      BOOLEAN           NOT NULL DEFAULT FALSE,
  action_url   TEXT,
  complaint_id UUID              REFERENCES public.complaints(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS
  'In-app notifications pushed to individual users.';

-- ── 12. Feedback ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID    UNIQUE NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  rating       INTEGER CHECK (rating >= 1 AND rating <= 5),
  comments     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_complaints_complainant
  ON public.complaints (complainant_id);

CREATE INDEX IF NOT EXISTS idx_complaints_status_priority
  ON public.complaints (status, priority);

CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to
  ON public.complaints (assigned_to);

CREATE INDEX IF NOT EXISTS idx_complaints_department
  ON public.complaints (department);

CREATE INDEX IF NOT EXISTS idx_complaints_is_anonymous
  ON public.complaints (is_anonymous);

CREATE INDEX IF NOT EXISTS idx_attachments_complaint
  ON public.attachments (complaint_id);

CREATE INDEX IF NOT EXISTS idx_comments_complaint
  ON public.comments (complaint_id);

CREATE INDEX IF NOT EXISTS idx_reveal_requests_complaint
  ON public.reveal_requests (complaint_id);

CREATE INDEX IF NOT EXISTS idx_reveal_requests_status
  ON public.reveal_requests (status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON public.audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_complaint
  ON public.audit_logs (complaint_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id) WHERE is_read = FALSE;

-- ── updated_at auto-trigger ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_reveal_requests_updated_at
  BEFORE UPDATE ON public.reveal_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Complaint number generator ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_complaint_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_val FROM public.complaints;
  NEW.complaint_number := 'GRV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq_val::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_complaints_number
  BEFORE INSERT ON public.complaints
  FOR EACH ROW
  WHEN (NEW.complaint_number IS NULL)
  EXECUTE FUNCTION public.generate_complaint_number();

-- ── Sync auth.users → public.users on sign-up ────────────────────────────────
-- When Supabase Auth creates a new user, this trigger inserts a matching row
-- in public.users using the metadata supplied at sign-up time.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, department, roll_number, designation)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'STUDENT'),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    NEW.raw_user_meta_data->>'roll_number',
    NEW.raw_user_meta_data->>'designation'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
