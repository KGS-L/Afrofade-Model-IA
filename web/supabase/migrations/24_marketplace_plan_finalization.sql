-- Afrofade Database Migration 24: stable marketplace product finalization
-- BMAD Story 12.6

ALTER TABLE public.salons
    ADD COLUMN IF NOT EXISTS marketplace_product_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_professional_subscriptions_payment_unique
    ON public.professional_subscriptions(payment_transaction_id)
    WHERE payment_transaction_id IS NOT NULL;

CREATE OR REPLACE FUNCTION finalize_afrofade_payment(
    p_payment_id UUID,
    p_provider_transaction_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    payment payment_transactions%ROWTYPE;
    credit_count INT;
    subscription_months INT;
    professional_profile UUID;
    existing_professional_subscription UUID;
    existing_professional_expiry TIMESTAMPTZ;
    salon_legacy_plan TEXT;
    stable_product_id TEXT;
BEGIN
    SELECT * INTO payment
    FROM payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'payment_not_found'; END IF;
    IF payment.status = 'paid' THEN
        RETURN jsonb_build_object('status','already_paid','payment_id',payment.id);
    END IF;
    IF payment.status <> 'pending' THEN RAISE EXCEPTION 'payment_not_pending'; END IF;

    UPDATE payment_transactions
    SET status='paid',
        provider_transaction_id=COALESCE(NULLIF(p_provider_transaction_id,''),provider_transaction_id),
        paid_at=NOW(), updated_at=NOW()
    WHERE id=payment.id;

    IF payment.purpose = 'credits' THEN
        credit_count := COALESCE((payment.metadata ->> 'credits')::INT,0);
        IF credit_count <= 0 THEN RAISE EXCEPTION 'invalid_credit_amount'; END IF;

        INSERT INTO credit_purchases(user_id,payment_transaction_id,pack_id,credits,status,credited_at)
        VALUES(payment.user_id,payment.id,payment.product_id,credit_count,'credited',NOW())
        ON CONFLICT(payment_transaction_id) DO NOTHING;

        INSERT INTO credit_wallets(user_id,balance,updated_at)
        VALUES(payment.user_id,credit_count,NOW())
        ON CONFLICT(user_id) DO UPDATE SET balance=credit_wallets.balance+EXCLUDED.balance,updated_at=NOW();

        INSERT INTO credit_transactions(user_id,delta,reason,reference_id,idempotency_key)
        VALUES(payment.user_id,credit_count,'credit_purchase',payment.id,'payment:'||payment.id::TEXT)
        ON CONFLICT(idempotency_key) DO NOTHING;

        RETURN jsonb_build_object('status','paid','payment_id',payment.id,'purpose','credits');
    END IF;

    IF payment.purpose <> 'subscription' THEN RAISE EXCEPTION 'unsupported_payment_purpose'; END IF;
    subscription_months := GREATEST(COALESCE((payment.metadata ->> 'months')::INT,1),1);

    IF payment.product_id = 'PROFESSIONAL_PRO' THEN
        IF payment.salon_id IS NOT NULL THEN RAISE EXCEPTION 'professional_subscription_cannot_target_salon'; END IF;
        professional_profile := NULLIF(payment.metadata ->> 'professionalProfileId','')::UUID;
        IF professional_profile IS NULL OR NOT EXISTS (
            SELECT 1 FROM professional_profiles
            WHERE id=professional_profile AND user_id=payment.user_id
        ) THEN
            RAISE EXCEPTION 'professional_subscription_owner_mismatch';
        END IF;

        SELECT id, expires_at INTO existing_professional_subscription, existing_professional_expiry
        FROM professional_subscriptions
        WHERE professional_profile_id=professional_profile
          AND product_id='PROFESSIONAL_PRO'
          AND status='active'
        ORDER BY expires_at DESC NULLS LAST
        LIMIT 1
        FOR UPDATE;

        IF existing_professional_subscription IS NOT NULL THEN
            UPDATE professional_subscriptions
            SET provider=payment.provider,
                payment_transaction_id=payment.id,
                starts_at=COALESCE(starts_at,NOW()),
                expires_at=GREATEST(COALESCE(existing_professional_expiry,NOW()),NOW()) + make_interval(months=>subscription_months),
                updated_at=NOW()
            WHERE id=existing_professional_subscription;
        ELSE
            INSERT INTO professional_subscriptions(
                professional_profile_id,user_id,product_id,provider,status,payment_transaction_id,starts_at,expires_at
            ) VALUES(
                professional_profile,payment.user_id,'PROFESSIONAL_PRO',payment.provider,'active',payment.id,NOW(),NOW()+make_interval(months=>subscription_months)
            );
        END IF;

        RETURN jsonb_build_object('status','paid','payment_id',payment.id,'purpose','subscription','subject','professional','product_id','PROFESSIONAL_PRO');
    END IF;

    IF payment.salon_id IS NULL THEN RAISE EXCEPTION 'salon_subscription_requires_salon'; END IF;

    salon_legacy_plan := CASE payment.product_id
        WHEN 'PRO' THEN 'PRO'
        WHEN 'VIP' THEN 'VIP'
        WHEN 'EXTRA' THEN 'EXTRA'
        WHEN 'SALON_PRO' THEN 'PRO'
        WHEN 'SALON_VIP' THEN 'VIP'
        WHEN 'SALON_EXTRA' THEN 'EXTRA'
        WHEN 'BUSINESS_MULTI_LOCATION' THEN 'EXTRA'
        ELSE NULL
    END;
    IF salon_legacy_plan IS NULL THEN RAISE EXCEPTION 'unknown_salon_subscription_product'; END IF;

    stable_product_id := CASE payment.product_id
        WHEN 'PRO' THEN 'SALON_PRO'
        WHEN 'VIP' THEN 'SALON_VIP'
        WHEN 'EXTRA' THEN 'SALON_EXTRA'
        ELSE payment.product_id
    END;

    INSERT INTO subscriptions(salon_id,provider,amount_fcfa,status,expires_at)
    VALUES(payment.salon_id,payment.provider,payment.amount_fcfa,'active',NOW()+make_interval(months=>subscription_months));

    UPDATE salons
    SET plan=salon_legacy_plan,
        marketplace_product_id=stable_product_id,
        updated_at=NOW()
    WHERE id=payment.salon_id;

    RETURN jsonb_build_object('status','paid','payment_id',payment.id,'purpose','subscription','subject','salon','product_id',stable_product_id);
END;
$$;

REVOKE ALL ON FUNCTION finalize_afrofade_payment(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_afrofade_payment(UUID,TEXT) TO service_role;
