alter table public.subscriptions
  add column if not exists apple_pending_price_id text,
  add column if not exists apple_pending_effective_at timestamptz;