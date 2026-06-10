ALTER TABLE public.subscriptions ALTER COLUMN paddle_subscription_id DROP NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN paddle_customer_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_paddle_subscription_id_key') THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_paddle_subscription_id_key;
  END IF;
END $$;

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_key
  ON public.subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;