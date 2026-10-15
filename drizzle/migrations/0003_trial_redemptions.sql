CREATE TABLE public.trial_redemptions (
  user_id uuid NOT NULL,
  apple_original_transaction_id text NOT NULL,
  product_id text NOT NULL,
  apple_environment text,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, apple_original_transaction_id)
);
GRANT SELECT ON public.trial_redemptions TO authenticated;
GRANT ALL ON public.trial_redemptions TO service_role;
ALTER TABLE public.trial_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own trial redemptions" ON public.trial_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Backfill any trial already verified by Apple.
INSERT INTO public.trial_redemptions (user_id, apple_original_transaction_id, product_id, apple_environment, redeemed_at)
SELECT user_id, apple_original_transaction_id, product_id, apple_environment, COALESCE(current_period_start, created_at, now())
FROM public.subscriptions WHERE status = 'trialing' AND apple_original_transaction_id IS NOT NULL
ON CONFLICT DO NOTHING;