DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_usage_events'
      AND column_name = 'id'
      AND is_identity = 'YES'
  ) THEN
    ALTER TABLE public.ai_usage_events
      ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
  END IF;
END
$$;
