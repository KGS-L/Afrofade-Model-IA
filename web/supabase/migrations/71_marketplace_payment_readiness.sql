-- Afrofade Database Migration 71: service payment readiness, disabled by default
-- BMAD Story 17.4

CREATE TABLE IF NOT EXISTS public.marketplace_feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(config)='object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.marketplace_feature_flags(key,enabled,config) VALUES
 ('service_online_payments',FALSE,'{"allowedModes":["pay_at_provider"]}'::jsonb),
 ('sponsored_listings',FALSE,'{}'::jsonb)
ON CONFLICT(key) DO NOTHING;

ALTER TABLE public.marketplace_services ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(24) NOT NULL DEFAULT 'pay_at_provider';
ALTER TABLE public.marketplace_services ADD COLUMN IF NOT EXISTS deposit_amount INT;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='marketplace_services_payment_mode_check') THEN ALTER TABLE public.marketplace_services ADD CONSTRAINT marketplace_services_payment_mode_check CHECK(payment_mode IN ('pay_at_provider','deposit','full_online'));END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='marketplace_services_deposit_check') THEN ALTER TABLE public.marketplace_services ADD CONSTRAINT marketplace_services_deposit_check CHECK(deposit_amount IS NULL OR deposit_amount>=0);END IF;
END$$;

CREATE OR REPLACE FUNCTION public.guard_marketplace_service_payment_mode() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
DECLARE flag BOOLEAN;
BEGIN
 SELECT enabled INTO flag FROM public.marketplace_feature_flags WHERE key='service_online_payments';
 IF NEW.payment_mode<>'pay_at_provider' AND NOT COALESCE(flag,FALSE) THEN RAISE EXCEPTION 'marketplace_online_payments_disabled';END IF;
 IF NEW.payment_mode='deposit' AND (NEW.deposit_amount IS NULL OR NEW.deposit_amount<=0 OR NEW.deposit_amount>NEW.price_amount) THEN RAISE EXCEPTION 'marketplace_deposit_invalid';END IF;
 IF NEW.payment_mode<>'deposit' THEN NEW.deposit_amount:=NULL;END IF;
 RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS trg_marketplace_service_payment_mode ON public.marketplace_services;
CREATE TRIGGER trg_marketplace_service_payment_mode BEFORE INSERT OR UPDATE OF payment_mode,deposit_amount,price_amount ON public.marketplace_services FOR EACH ROW EXECUTE FUNCTION public.guard_marketplace_service_payment_mode();

ALTER TABLE public.marketplace_feature_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketplace_feature_flags FROM anon,authenticated;
GRANT ALL ON public.marketplace_feature_flags TO service_role;
REVOKE ALL ON FUNCTION public.guard_marketplace_service_payment_mode() FROM PUBLIC;
COMMENT ON COLUMN public.marketplace_services.payment_mode IS 'MVP defaults to pay_at_provider. deposit/full_online are schema-ready but blocked while service_online_payments=false.';
