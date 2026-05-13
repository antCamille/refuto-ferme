-- ============================================================
-- Stripe Payment Integration Migration
-- Run this in Supabase > SQL Editor BEFORE deploying the frontend
-- ============================================================

-- Add Stripe tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT NULL;

-- Index for webhook lookups by payment intent ID
CREATE INDEX IF NOT EXISTS orders_stripe_pi_idx
  ON public.orders(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- ============================================================
-- Supabase secrets to set via CLI or dashboard:
--   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
--   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
--
-- Edge functions to deploy:
--   supabase functions deploy create-payment-intent
--   supabase functions deploy stripe-webhook
--
-- Stripe webhook endpoint to register:
--   https://<project>.supabase.co/functions/v1/stripe-webhook
--   Events: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
-- ============================================================
