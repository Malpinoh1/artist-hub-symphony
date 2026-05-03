CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with the same name
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-usd-ngn-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'refresh-usd-ngn-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://hewyffhdykietximpfbu.supabase.co/functions/v1/fetch-exchange-rate',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhld3lmZmhkeWtpZXR4aW1wZmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjk1ODYsImV4cCI6MjA1ODkwNTU4Nn0.UqxDgfYqm3yhC8nDYdfcb8UDm9rz9qFKq-pIh6xEB-Y"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);