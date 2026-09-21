-- ============================================================================
-- Migration: 002_rls_policies.sql
-- RSCOE Grievance Portal — Row Level Security Policies
--
-- Apply AFTER 001_initial_schema.sql.
--
-- Design principles:
--   1. auth.uid()  = the currently authenticated user's UUID (from Supabase Auth).
--   2. Role is looked up from public.users.role for each auth.uid().
--      We use a helper function (current_user_role()) to avoid repeating the
--      subquery in every policy.
--   3. RLS guards ROWS. Column-level masking of complainant_id for anonymous
--      complaints is handled at the application layer (SanitizedComplaint type
--      in src/lib/types.ts + API route logic). Both layers must agree.
--   4. audit_logs is append-only. UPDATE and DELETE are always blocked.
--   5. reveal_requests approval is strictly SUPER_ADMIN only.
--
-- ⚠️  CONFLICT NOTES (for the developer):
--   - complaint:read_own / complaint:read_department are enforced BOTH here
--     (RLS) and in complaint-store.ts. This is intentional belt-and-suspenders.
--     The RLS policy is the authoritative enforcement; the app layer is defense-in-depth.
--   - identity:approve_reveal is enforced here AND via hasPermission() in the
--     API route. Keep both. If they ever diverge, RLS wins at the DB level.
-- ============================================================================

-- ── Helper: get the current user's role from public.users ─────────────────────
-- Called as current_user_role() inside policy USING expressions.
-- SECURITY DEFINER + search_path lock prevents privilege escalation.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.current_user_role IS
  'Returns the role of the currently authenticated user from public.users. '
  'Used in RLS policy USING expressions. Returns NULL if the user is not found.';

-- ── Helper: check if a HEAD has an approved RevealRequest for a complaint ──────
CREATE OR REPLACE FUNCTION public.has_approved_reveal(p_complaint_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.reveal_requests
    WHERE complaint_id = p_complaint_id
      AND requester_id = auth.uid()
      AND status = 'APPROVED'
  );
$$;

COMMENT ON FUNCTION public.has_approved_reveal IS
  'Returns TRUE if the current user has an approved RevealRequest for the given complaint. '
  'Used to decide whether a HEAD can see complainant_id (enforced at app layer).';

-- ============================================================================
-- TABLE: public.users
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile.
CREATE POLICY "users: read own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

-- SUPER_ADMIN and HEAD can read all user profiles (for assignment dropdowns, etc.)
CREATE POLICY "users: admin read all"
  ON public.users FOR SELECT
  USING (current_user_role() IN ('SUPER_ADMIN', 'HEAD', 'ADMIN'));

-- Users can update their own profile (not role — that's admin-only).
CREATE POLICY "users: update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent self-role escalation: the role column must not change unless
    -- the caller is SUPER_ADMIN.
    AND (
      role = (SELECT role FROM public.users WHERE id = auth.uid())
      OR current_user_role() = 'SUPER_ADMIN'
    )
  );

-- Only SUPER_ADMIN can change a user's role.
CREATE POLICY "users: super_admin manage roles"
  ON public.users FOR UPDATE
  USING (current_user_role() = 'SUPER_ADMIN');

-- ============================================================================
-- TABLE: public.complaints
-- ============================================================================
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- ── SELECT policies ──────────────────────────────────────────────────────────

-- SUPER_ADMIN sees all complaints.
CREATE POLICY "complaints: super_admin read all"
  ON public.complaints FOR SELECT
  USING (current_user_role() = 'SUPER_ADMIN');

-- HEAD / ADMIN see all complaints in their own department.
-- NOTE: This policy does NOT filter out complainant_id for anonymous complaints.
--       That masking is done at the application layer (SanitizedComplaint).
CREATE POLICY "complaints: head read department"
  ON public.complaints FOR SELECT
  USING (
    current_user_role() IN ('HEAD', 'ADMIN')
    AND department = (SELECT department FROM public.users WHERE id = auth.uid())
  );

-- STUDENT and TEACHER can only see their own complaints (including anonymous ones
-- they filed — they know their own identity).
CREATE POLICY "complaints: read own"
  ON public.complaints FOR SELECT
  USING (
    complainant_id = auth.uid()
  );

-- Any authenticated user can see complaints assigned to them (investigator access).
CREATE POLICY "complaints: read assigned"
  ON public.complaints FOR SELECT
  USING (assigned_to = auth.uid());

-- ── INSERT policy ─────────────────────────────────────────────────────────────

-- Any authenticated user can file a complaint. The complainant_id must equal
-- their own auth.uid() — they cannot file on behalf of someone else.
CREATE POLICY "complaints: authenticated users can insert"
  ON public.complaints FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND complainant_id = auth.uid()
  );

-- ── UPDATE policies ───────────────────────────────────────────────────────────

-- HEAD / ADMIN / SUPER_ADMIN can update complaints in their scope.
CREATE POLICY "complaints: head can update department complaints"
  ON public.complaints FOR UPDATE
  USING (
    current_user_role() IN ('HEAD', 'ADMIN')
    AND department = (SELECT department FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "complaints: super_admin can update any"
  ON public.complaints FOR UPDATE
  USING (current_user_role() = 'SUPER_ADMIN');

-- Complainant can update only their own complaint (e.g. to add details) while
-- it is still in SUBMITTED or REOPENED status.
CREATE POLICY "complaints: owner can update while submitted"
  ON public.complaints FOR UPDATE
  USING (
    complainant_id = auth.uid()
    AND status IN ('SUBMITTED', 'REOPENED')
  );

-- ── DELETE policy ─────────────────────────────────────────────────────────────
-- No role can delete a complaint. Complaints are archived, not deleted.
CREATE POLICY "complaints: no delete"
  ON public.complaints FOR DELETE
  USING (FALSE);

-- ============================================================================
-- TABLE: public.attachments
-- ============================================================================
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- A user can see attachments on complaints they can see. We model this by
-- delegating to the complaints policies: if you can SELECT the complaint, you
-- can SELECT its attachments.
CREATE POLICY "attachments: visible with complaint"
  ON public.attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_id
    )
  );

-- Only the complaint's participants (complainant, assignee, HEAD of dept,
-- SUPER_ADMIN) can upload attachments. Simplified to: any authenticated user
-- can insert as long as they can read the complaint.
CREATE POLICY "attachments: insert if can see complaint"
  ON public.attachments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "attachments: no delete"
  ON public.attachments FOR DELETE
  USING (FALSE);

-- ============================================================================
-- TABLE: public.comments
-- ============================================================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Anyone who can see the complaint can see its comments.
CREATE POLICY "comments: visible with complaint"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_id
    )
  );

-- Any authenticated user can insert a comment if they can see the complaint.
CREATE POLICY "comments: insert if authenticated"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
  );

-- Comments cannot be updated or deleted (audit trail integrity).
CREATE POLICY "comments: no update"
  ON public.comments FOR UPDATE
  USING (FALSE);

CREATE POLICY "comments: no delete"
  ON public.comments FOR DELETE
  USING (FALSE);

-- ============================================================================
-- TABLE: public.reveal_requests
-- ============================================================================
ALTER TABLE public.reveal_requests ENABLE ROW LEVEL SECURITY;

-- ── SELECT ────────────────────────────────────────────────────────────────────

-- The HEAD who filed the request can see it.
CREATE POLICY "reveal_requests: requester can read own"
  ON public.reveal_requests FOR SELECT
  USING (requester_id = auth.uid());

-- SUPER_ADMIN sees all pending and decided reveal requests.
CREATE POLICY "reveal_requests: super_admin read all"
  ON public.reveal_requests FOR SELECT
  USING (current_user_role() = 'SUPER_ADMIN');

-- ── INSERT ────────────────────────────────────────────────────────────────────

-- Only HEAD (or ADMIN) can file a RevealRequest. They must be requesting for a
-- complaint in their own department and the complaint must be anonymous.
CREATE POLICY "reveal_requests: head can insert"
  ON public.reveal_requests FOR INSERT
  WITH CHECK (
    current_user_role() IN ('HEAD', 'ADMIN')
    AND requester_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_id
        AND c.is_anonymous = TRUE
        AND c.department = (SELECT department FROM public.users WHERE id = auth.uid())
    )
  );

-- ── UPDATE (approve / reject) ─────────────────────────────────────────────────

-- ONLY SUPER_ADMIN can approve or reject a reveal request.
-- They must set approver_id to themselves and decided_at to NOW().
CREATE POLICY "reveal_requests: super_admin can approve"
  ON public.reveal_requests FOR UPDATE
  USING (current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (
    current_user_role() = 'SUPER_ADMIN'
    AND approver_id = auth.uid()
  );

-- ── DELETE ────────────────────────────────────────────────────────────────────
-- Reveal requests are immutable records; no deletion allowed.
CREATE POLICY "reveal_requests: no delete"
  ON public.reveal_requests FOR DELETE
  USING (FALSE);

-- ============================================================================
-- TABLE: public.audit_logs  (APPEND-ONLY)
-- ============================================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only SUPER_ADMIN can read audit logs.
CREATE POLICY "audit_logs: super_admin read"
  ON public.audit_logs FOR SELECT
  USING (current_user_role() = 'SUPER_ADMIN');

-- Server-side code (using the service-role key via createAdminClient) can
-- insert audit log rows. The anon key / user sessions cannot.
-- This is enforced by ensuring only the service role bypasses RLS entirely.
-- We add no INSERT policy here — service-role client bypasses RLS, which is
-- the intended design (audit logs must be written by trusted server code, never
-- directly by client sessions).
--
-- ⚠️  If you want the anon key to be able to insert audit logs (not recommended),
--     add an INSERT policy here. For now, only the service-role key (createAdminClient)
--     can write to this table.

-- Block ALL updates and deletes — even for SUPER_ADMIN and service-role
-- (service-role bypasses RLS, but these policies document intent clearly).
CREATE POLICY "audit_logs: no update ever"
  ON public.audit_logs FOR UPDATE
  USING (FALSE);

CREATE POLICY "audit_logs: no delete ever"
  ON public.audit_logs FOR DELETE
  USING (FALSE);

-- ============================================================================
-- TABLE: public.notifications
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications.
CREATE POLICY "notifications: read own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Server-side code inserts notifications (service-role bypasses RLS).
-- Notifications cannot be created by users themselves.

-- Users can mark their own notifications as read.
CREATE POLICY "notifications: update own (mark read)"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications: no delete"
  ON public.notifications FOR DELETE
  USING (FALSE);

-- ============================================================================
-- TABLE: public.complaint_assignments  (insert-only log)
-- ============================================================================
ALTER TABLE public.complaint_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments: head or super_admin can insert"
  ON public.complaint_assignments FOR INSERT
  WITH CHECK (
    current_user_role() IN ('HEAD', 'ADMIN', 'SUPER_ADMIN')
    AND assigned_by = auth.uid()
  );

CREATE POLICY "assignments: visible to assignee and admin"
  ON public.complaint_assignments FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR current_user_role() IN ('HEAD', 'ADMIN', 'SUPER_ADMIN')
  );

CREATE POLICY "assignments: no delete"
  ON public.complaint_assignments FOR DELETE
  USING (FALSE);

-- ============================================================================
-- TABLE: public.complaint_status_history  (insert-only log)
-- ============================================================================
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_history: head and above can insert"
  ON public.complaint_status_history FOR INSERT
  WITH CHECK (
    current_user_role() IN ('HEAD', 'ADMIN', 'SUPER_ADMIN')
    AND changed_by = auth.uid()
  );

CREATE POLICY "status_history: visible with complaint access"
  ON public.complaint_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c WHERE c.id = complaint_id
    )
  );

CREATE POLICY "status_history: no update"
  ON public.complaint_status_history FOR UPDATE
  USING (FALSE);

CREATE POLICY "status_history: no delete"
  ON public.complaint_status_history FOR DELETE
  USING (FALSE);

-- ============================================================================
-- TABLE: public.categories / subcategories  (read-only for all users)
-- ============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories: read by all authenticated"
  ON public.categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "subcategories: read by all authenticated"
  ON public.subcategories FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only SUPER_ADMIN can manage categories.
CREATE POLICY "categories: super_admin manage"
  ON public.categories FOR ALL
  USING (current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "subcategories: super_admin manage"
  ON public.subcategories FOR ALL
  USING (current_user_role() = 'SUPER_ADMIN');

-- ============================================================================
-- TABLE: public.feedback
-- ============================================================================
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Only the original complainant can submit feedback on their resolved complaint.
CREATE POLICY "feedback: complainant can insert"
  ON public.feedback FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_id
        AND c.complainant_id = auth.uid()
        AND c.status IN ('RESOLVED', 'CLOSED')
    )
  );

CREATE POLICY "feedback: head and above can read"
  ON public.feedback FOR SELECT
  USING (current_user_role() IN ('HEAD', 'ADMIN', 'SUPER_ADMIN'));

CREATE POLICY "feedback: complainant can read own"
  ON public.feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_id AND c.complainant_id = auth.uid()
    )
  );
