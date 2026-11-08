-- ==============================================================================
-- WanWang - Production schema (Supabase / PostgreSQL). Idempotent: safe to re-run.
-- Access model: ONLY the server (service-role key) touches these tables.
-- RLS is enabled with NO policies for anon/authenticated => direct access denied.
-- ==============================================================================

-- 1. Events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    granularity TEXT NOT NULL DEFAULT 'day',
    dates JSONB NOT NULL,                  -- ["2026-11-14", ...]
    start_time TEXT NOT NULL DEFAULT '09:00',
    end_time TEXT NOT NULL DEFAULT '22:00',
    slot_interval INTEGER NOT NULL DEFAULT 60,
    confirmed_date TEXT,
    admin_key TEXT NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade path for databases created from the older schema
ALTER TABLE events ADD COLUMN IF NOT EXISTS granularity TEXT NOT NULL DEFAULT 'day';
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TEXT NOT NULL DEFAULT '22:00';
ALTER TABLE events ADD COLUMN IF NOT EXISTS slot_interval INTEGER NOT NULL DEFAULT 60;
ALTER TABLE events ADD COLUMN IF NOT EXISTS confirmed_date TEXT;

-- 2. Participants
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    note TEXT,
    edit_token TEXT NOT NULL,
    availability JSONB NOT NULL DEFAULT '[]'::jsonb,  -- slot ids: "2026-11-14", "2026-11-14Tevening", ...
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade: old column was named available_dates
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'participants' AND column_name = 'available_dates'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'participants' AND column_name = 'availability'
    ) THEN
        ALTER TABLE participants RENAME COLUMN available_dates TO availability;
    END IF;
END $$;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS availability JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. Basic integrity limits (defense in depth; API validates too)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_limits;
ALTER TABLE events ADD CONSTRAINT events_limits CHECK (
    char_length(title) <= 100
    AND granularity IN ('day', 'daypart', 'hour')
    AND slot_interval IN (30, 60)
);
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_limits;
ALTER TABLE participants ADD CONSTRAINT participants_limits CHECK (
    char_length(name) <= 50
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);

-- 5. RLS: enable and REMOVE every public policy (old schema allowed anon read/write/delete,
--    which exposed admin_key / edit_token and let anyone delete data via the public anon key).
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read events" ON events;
DROP POLICY IF EXISTS "Public insert events" ON events;
DROP POLICY IF EXISTS "Admin update events" ON events;
DROP POLICY IF EXISTS "Admin delete events" ON events;
DROP POLICY IF EXISTS "Public read participants" ON participants;
DROP POLICY IF EXISTS "Public insert participants" ON participants;
DROP POLICY IF EXISTS "Owner update participants" ON participants;
DROP POLICY IF EXISTS "Owner delete participants" ON participants;

REVOKE ALL ON events FROM anon, authenticated;
REVOKE ALL ON participants FROM anon, authenticated;

-- 6. Rate limiting: fixed-window counter per key, shared across serverless instances.
--    Keys hold a keyed hash of the client IP, never the raw address.
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    reset_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rate_limits FROM anon, authenticated;
GRANT ALL ON rate_limits TO service_role;

-- Returns 0 if allowed, otherwise the seconds to wait.
CREATE OR REPLACE FUNCTION check_rate_limit(p_key TEXT, p_limit INTEGER, p_window_seconds INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_count INTEGER;
    v_reset TIMESTAMPTZ;
BEGIN
    INSERT INTO public.rate_limits AS r (key, count, reset_at)
    VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
    ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN r.reset_at <= now() THEN 1 ELSE r.count + 1 END,
        reset_at = CASE WHEN r.reset_at <= now() THEN EXCLUDED.reset_at ELSE r.reset_at END
    RETURNING r.count, r.reset_at INTO v_count, v_reset;

    -- Sweep expired rows now and then, so this needs no pg_cron.
    IF random() < 0.01 THEN
        DELETE FROM public.rate_limits
        WHERE key IN (
            SELECT l.key FROM public.rate_limits l
            WHERE l.reset_at <= now()
            FOR UPDATE SKIP LOCKED
        );
    END IF;

    IF v_count <= p_limit THEN
        RETURN 0;
    END IF;
    RETURN GREATEST(1, CEIL(EXTRACT(EPOCH FROM v_reset - now()))::INTEGER);
END;
$$;

-- Supabase exposes public functions over PostgREST, so lock this to the server.
REVOKE ALL ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- 7. Optional retention (enable pg_cron first): delete events older than 180 days
-- SELECT cron.schedule('wanwang-cleanup', '0 3 * * *',
--   $$DELETE FROM events WHERE created_at < NOW() - INTERVAL '180 days'$$);
