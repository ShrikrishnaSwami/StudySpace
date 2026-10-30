-- Remove a duplicate btree index on ai_usage_events(created_at).
-- Keep ai_usage_events_created_at_idx; the duplicate adds write/storage overhead
-- without improving the rolling-window quota query.
DROP INDEX IF EXISTS public.ai_usage_events_created_idx;
