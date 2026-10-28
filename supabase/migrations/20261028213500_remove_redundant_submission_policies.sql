-- Remove two redundant assignment_submissions policies without changing
-- effective access: the remaining INSERT policy already permits rows linked
-- to assignments owned by or assigned to the current user, and the remaining
-- SELECT policy has the exact same user_id ownership predicate.
DROP POLICY IF EXISTS "Users create own submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Students view assigned submissions" ON public.assignment_submissions;
