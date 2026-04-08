-- Enable pg_cron (available on Supabase by default)
CREATE EXTENSION IF NOT EXISTS pg_cron;
--> statement-breakpoint

-- Release abandoned reservations every minute
SELECT cron.schedule(
  'cleanup-expired-reservations',
  '* * * * *',
  $$SELECT cleanup_expired_reservations()$$
);
