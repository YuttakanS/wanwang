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
-- The app connects only as service_role, so do not rely on a project's default grants.
GRANT ALL ON events TO service_role;
GRANT ALL ON participants TO service_role;

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

-- 7. Store admin keys as SHA-256 hex. One-way: plaintext keys in this table cannot be recovered.
--    Keys already held by browsers and admin links keep working. Re-running skips hashed rows.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_admin_key_hashed;
UPDATE events
SET admin_key = encode(sha256(convert_to(admin_key, 'UTF8')), 'hex')
WHERE admin_key !~ '^[0-9a-f]{64}$';
ALTER TABLE events ADD CONSTRAINT events_admin_key_hashed CHECK (admin_key ~ '^[0-9a-f]{64}$');

-- 8. Store edit tokens as SHA-256 hex, same as admin keys. One-way; tokens held by browsers keep working.
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_edit_token_hashed;
UPDATE participants
SET edit_token = encode(sha256(convert_to(edit_token, 'UTF8')), 'hex')
WHERE edit_token !~ '^[0-9a-f]{64}$';
ALTER TABLE participants ADD CONSTRAINT participants_edit_token_hashed CHECK (edit_token ~ '^[0-9a-f]{64}$');

-- 9. Feedback from the /feedback form. Holds no name, contact, or IP: only what the sender typed.
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'other',
    rating SMALLINT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_limits;
ALTER TABLE feedback ADD CONSTRAINT feedback_limits CHECK (
    type IN ('bug', 'idea', 'praise', 'other')
    AND (rating IS NULL OR rating BETWEEN 1 AND 5)
    AND char_length(message) BETWEEN 1 AND 1000
);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feedback FROM anon, authenticated;
GRANT ALL ON feedback TO service_role;

-- 10. Questions the creator asks, the answers, and limits on picking slots.
--     questions: [{id, type: text|choice|multi|file, label, required, options?}]
--     answers:   {"<question id>": "text" | ["option", ...] | {path, name, size}}
--     Answers are returned only to the event's creator and to the person who gave them (API-side).
ALTER TABLE events ADD COLUMN IF NOT EXISTS questions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_per_slot INTEGER;   -- people per slot; NULL = no limit
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_picks INTEGER;      -- slots per person; NULL = no limit
ALTER TABLE participants ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_question_limits;
ALTER TABLE events ADD CONSTRAINT events_question_limits CHECK (
    jsonb_typeof(questions) = 'array'
    AND jsonb_array_length(questions) <= 10
    AND (max_per_slot IS NULL OR max_per_slot BETWEEN 1 AND 1000)
    AND (max_picks IS NULL OR max_picks BETWEEN 1 AND 10000)
);

-- The API checks the per-slot limit before saving, but two saves arriving together would both
-- pass that check. This trigger is what makes the limit hold: saves for one event take a lock
-- and are counted one at a time. A slot the person already held is not counted again, so people
-- in a full slot can still edit their answer.
CREATE OR REPLACE FUNCTION enforce_slot_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_cap INTEGER;
    v_old JSONB := '[]'::jsonb;
    v_full TEXT;
BEGIN
    SELECT e.max_per_slot INTO v_cap FROM public.events e WHERE e.id = NEW.event_id;
    IF v_cap IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        v_old := OLD.availability;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.event_id::text, 0));

    SELECT o.slot INTO v_full
    FROM public.participants p
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements_text(p.availability) AS o(slot)
    WHERE p.event_id = NEW.event_id
      AND p.id <> NEW.id
      AND NEW.availability ? o.slot
      AND NOT (v_old ? o.slot)
    GROUP BY o.slot
    HAVING count(*) >= v_cap
    LIMIT 1;

    IF v_full IS NOT NULL THEN
        -- src/lib/db.ts looks for this text.
        RAISE EXCEPTION 'SLOT_FULL: %', v_full USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS participants_slot_capacity ON participants;
CREATE TRIGGER participants_slot_capacity
    BEFORE INSERT OR UPDATE OF availability ON participants
    FOR EACH ROW EXECUTE FUNCTION enforce_slot_capacity();

-- 11. Files attached to answers: a private bucket, reachable only with the service-role key.
--     Browsers upload and download through short-lived signed URLs issued by the API.
--     No policies on storage.objects for this bucket => anon/authenticated have no access.
--     file_size_limit must match QUESTION_LIMITS.fileBytes in src/types/index.ts (20 MB).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('event-files', 'event-files', FALSE, 20971520)
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = EXCLUDED.file_size_limit;

-- 12. Retention: delete events 90 days after their last date, votes included (ON DELETE CASCADE).
--    Counted from the last date, not creation: a 1-year event must survive until it has happened.
--    created_at protects a new event whose dates are already in the past.
--    src/lib/privacyContent.ts promises this period, so change them together.
CREATE OR REPLACE FUNCTION purge_expired_events()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.events e
    WHERE GREATEST(
        e.created_at::date,
        CASE WHEN e.dates ->> -1 ~ '^\d{4}-\d{2}-\d{2}$' THEN (e.dates ->> -1)::date END
    ) < CURRENT_DATE - 90;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    DELETE FROM public.rate_limits WHERE reset_at <= now();

    -- src/lib/privacyContent.ts promises this period too.
    DELETE FROM public.feedback WHERE created_at < now() - INTERVAL '1 year';

    RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION purge_expired_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION purge_expired_events() TO service_role;

-- Runs daily at 03:00 UTC. Scheduling under the same name replaces the job, so re-running is safe.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
        PERFORM cron.schedule('wanwang-cleanup', '0 3 * * *', 'SELECT public.purge_expired_events()');
    ELSE
        RAISE WARNING 'pg_cron is not available: purge_expired_events() must be scheduled another way';
    END IF;
END $$;

-- 13. Usage statistics for the owner: one running total per day and metric, nothing else.
--     No names, addresses, or content, so a total says nothing about any person. It has to live
--     apart from the rows it counts, because the retention job in section 12 deletes those.
--     Read by scripts/owner-stats.mjs through owner_stats(); the website never reads it.
--     Metrics: events_created, events_with_questions, events_with_limit, responses,
--              files_attached, feedback_received.
CREATE TABLE IF NOT EXISTS stats_daily (
    day DATE NOT NULL,                     -- Thai calendar day
    metric TEXT NOT NULL,
    count BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (day, metric)
);
ALTER TABLE stats_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON stats_daily FROM anon, authenticated;
GRANT ALL ON stats_daily TO service_role;

-- Counts what is stored right now, once, so the totals do not start from zero on the day this is
-- installed. Skipped on every later run: by then the triggers below are keeping count.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM stats_daily) THEN
        INSERT INTO stats_daily (day, metric, count)
        SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date, 'events_created', count(*)
        FROM events GROUP BY 1
        UNION ALL
        SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date, 'events_with_questions', count(*)
        FROM events WHERE jsonb_array_length(questions) > 0 GROUP BY 1
        UNION ALL
        SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date, 'events_with_limit', count(*)
        FROM events WHERE max_per_slot IS NOT NULL GROUP BY 1
        UNION ALL
        SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date, 'responses', count(*)
        FROM participants GROUP BY 1
        UNION ALL
        SELECT (p.created_at AT TIME ZONE 'Asia/Bangkok')::date, 'files_attached', count(*)
        FROM participants p
        CROSS JOIN LATERAL jsonb_each(p.answers) AS a
        WHERE jsonb_typeof(a.value) = 'object' AND a.value ? 'path'
        GROUP BY 1
        UNION ALL
        SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date, 'feedback_received', count(*)
        FROM feedback GROUP BY 1;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION bump_stat(p_metric TEXT, p_by BIGINT DEFAULT 1)
RETURNS VOID
LANGUAGE sql
SET search_path = ''
AS $$
    INSERT INTO public.stats_daily AS s (day, metric, count)
    VALUES ((now() AT TIME ZONE 'Asia/Bangkok')::date, p_metric, p_by)
    ON CONFLICT (day, metric) DO UPDATE SET count = s.count + EXCLUDED.count;
$$;
REVOKE ALL ON FUNCTION bump_stat(TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION bump_stat(TEXT, BIGINT) TO service_role;

-- One trigger function for the three tables. Counting must never be the reason a save fails,
-- so any error here is swallowed: a missed count is better than a lost event or answer.
CREATE OR REPLACE FUNCTION count_new_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_files BIGINT;
BEGIN
    IF TG_TABLE_NAME = 'events' THEN
        PERFORM public.bump_stat('events_created');
        IF pg_catalog.jsonb_array_length(NEW.questions) > 0 THEN
            PERFORM public.bump_stat('events_with_questions');
        END IF;
        IF NEW.max_per_slot IS NOT NULL THEN
            PERFORM public.bump_stat('events_with_limit');
        END IF;
    ELSIF TG_TABLE_NAME = 'participants' THEN
        PERFORM public.bump_stat('responses');
        SELECT count(*) INTO v_files
        FROM pg_catalog.jsonb_each(NEW.answers) AS a
        WHERE pg_catalog.jsonb_typeof(a.value) = 'object' AND a.value ? 'path';
        IF v_files > 0 THEN
            PERFORM public.bump_stat('files_attached', v_files);
        END IF;
    ELSIF TG_TABLE_NAME = 'feedback' THEN
        PERFORM public.bump_stat('feedback_received');
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'count_new_row failed on %: %', TG_TABLE_NAME, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_count_new ON events;
CREATE TRIGGER events_count_new AFTER INSERT ON events
    FOR EACH ROW EXECUTE FUNCTION count_new_row();
DROP TRIGGER IF EXISTS participants_count_new ON participants;
CREATE TRIGGER participants_count_new AFTER INSERT ON participants
    FOR EACH ROW EXECUTE FUNCTION count_new_row();
DROP TRIGGER IF EXISTS feedback_count_new ON feedback;
CREATE TRIGGER feedback_count_new AFTER INSERT ON feedback
    FOR EACH ROW EXECUTE FUNCTION count_new_row();

-- Everything the owner's report shows, in one call.
--   totals / daily: all-time, from stats_daily.
--   stored_now: what is in the tables at this moment (older events have been deleted).
CREATE OR REPLACE FUNCTION owner_stats()
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
    SELECT jsonb_build_object(
        'generated_at', now(),
        'first_day', (SELECT min(day) FROM public.stats_daily),
        'totals', COALESCE((
            SELECT jsonb_object_agg(t.metric, t.total)
            FROM (SELECT metric, sum(count) AS total FROM public.stats_daily GROUP BY metric) t
        ), '{}'::jsonb),
        'daily', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('day', d.day, 'metric', d.metric, 'count', d.count) ORDER BY d.day, d.metric)
            FROM public.stats_daily d
        ), '[]'::jsonb),
        'stored_now', jsonb_build_object(
            'events', (SELECT count(*) FROM public.events),
            'responses', (SELECT count(*) FROM public.participants),
            'events_with_responses', (SELECT count(DISTINCT event_id) FROM public.participants),
            'biggest_event', COALESCE((
                SELECT max(x.n) FROM (SELECT count(*) AS n FROM public.participants GROUP BY event_id) x
            ), 0)
        ),
        'feedback', jsonb_build_object(
            'count', (SELECT count(*) FROM public.feedback),
            'rated', (SELECT count(*) FROM public.feedback WHERE rating IS NOT NULL),
            'avg_rating', (SELECT round(avg(rating), 2) FROM public.feedback WHERE rating IS NOT NULL),
            'by_type', COALESCE((
                SELECT jsonb_object_agg(f.type, f.n)
                FROM (SELECT type, count(*) AS n FROM public.feedback GROUP BY type) f
            ), '{}'::jsonb)
        )
    );
$$;
REVOKE ALL ON FUNCTION owner_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION owner_stats() TO service_role;
