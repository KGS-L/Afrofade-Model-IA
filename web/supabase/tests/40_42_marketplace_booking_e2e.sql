\set ON_ERROR_STOP on
BEGIN;
-- Contract is intended to run after production marketplace migrations through 42.
DO $$ BEGIN
  IF to_regclass('public.marketplace_bookings') IS NULL THEN RAISE EXCEPTION 'marketplace_bookings missing'; END IF;
  IF to_regclass('public.notification_outbox') IS NULL THEN RAISE EXCEPTION 'notification_outbox missing'; END IF;
  IF to_regclass('public.saved_looks') IS NULL THEN RAISE EXCEPTION 'saved_looks missing'; END IF;
END $$;
CREATE FUNCTION pg_temp.assert_true(v BOOLEAN,m TEXT) RETURNS VOID LANGUAGE plpgsql AS $$BEGIN IF NOT COALESCE(v,FALSE) THEN RAISE EXCEPTION 'assertion failed: %',m;END IF;END$$;
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM pg_constraint WHERE conname='marketplace_bookings_no_professional_overlap'),'anti-overlap exclusion exists');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM pg_proc WHERE proname='create_marketplace_booking'),'atomic booking function exists');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM pg_proc WHERE proname='transition_marketplace_booking'),'controlled transition exists');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM pg_proc WHERE proname='list_service_availability'),'availability engine exists');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM pg_proc WHERE proname='attach_saved_look_to_booking'),'visual brief attachment exists');
SELECT pg_temp.assert_true((SELECT relrowsecurity FROM pg_class WHERE oid='public.marketplace_bookings'::regclass),'bookings RLS enabled');
SELECT pg_temp.assert_true((SELECT relrowsecurity FROM pg_class WHERE oid='public.saved_looks'::regclass),'saved looks RLS enabled');
SELECT pg_temp.assert_true((SELECT relrowsecurity FROM pg_class WHERE oid='public.notification_outbox'::regclass),'notifications RLS enabled');
ROLLBACK;
\echo 'Marketplace booking E2E structural contract: PASS'
