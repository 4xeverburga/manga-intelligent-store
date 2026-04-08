-- Enable pg_cron extension (available on Supabase by default)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup_expired_reservations to run every minute
SELECT cron.schedule(
  'cleanup-expired-reservations',
  '* * * * *',
  $$SELECT cleanup_expired_reservations()$$
);
