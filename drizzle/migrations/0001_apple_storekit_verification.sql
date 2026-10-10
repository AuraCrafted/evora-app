ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id text,
  ADD COLUMN IF NOT EXISTS apple_environment text,
  ADD COLUMN IF NOT EXISTS apple_auto_renew boolean,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_apple_original_tx_uidx
  ON public.subscriptions (apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.apple_notification_events (
  notification_uuid text PRIMARY KEY,
  notification_type text NOT NULL,
  subtype text,
  original_transaction_id text,
  environment text,
  signed_date timestamptz,
  processed_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.apple_notification_events TO service_role;
ALTER TABLE public.apple_notification_events ENABLE ROW LEVEL SECURITY;