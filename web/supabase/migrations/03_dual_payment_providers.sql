-- Afrofade Database Migration 03: dual payment providers
-- Extends P0 commerce integrity to Money Fusion + GeniusPay.

ALTER TABLE payment_transactions
    DROP CONSTRAINT IF EXISTS payment_transactions_provider_check;

ALTER TABLE payment_transactions
    ADD CONSTRAINT payment_transactions_provider_check
    CHECK (provider IN ('money_fusion', 'genius_pay'));

CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_token
    ON payment_transactions(provider, provider_token);

-- Recreate the atomic/idempotent finalizer so subscriptions retain the
-- provider that was actually used instead of hard-coding Money Fusion.
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
BEGIN
    SELECT * INTO payment
    FROM payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'payment_not_found';
    END IF;

    IF payment.status = 'paid' THEN
        RETURN jsonb_build_object(
            'status', 'already_paid',
            'payment_id', payment.id,
            'provider', payment.provider
        );
    END IF;

    IF payment.status <> 'pending' THEN
        RAISE EXCEPTION 'payment_not_pending';
    END IF;

    IF payment.provider NOT IN ('money_fusion', 'genius_pay') THEN
        RAISE EXCEPTION 'unsupported_payment_provider';
    END IF;

    UPDATE payment_transactions
    SET status = 'paid',
        provider_transaction_id = COALESCE(NULLIF(p_provider_transaction_id, ''), provider_transaction_id),
        paid_at = NOW(),
        updated_at = NOW()
    WHERE id = payment.id;

    IF payment.purpose = 'credits' THEN
        credit_count := COALESCE((payment.metadata ->> 'credits')::INT, 0);
        IF credit_count <= 0 THEN
            RAISE EXCEPTION 'invalid_credit_amount';
        END IF;

        INSERT INTO credit_purchases (user_id, payment_transaction_id, pack_id, credits, status, credited_at)
        VALUES (payment.user_id, payment.id, payment.product_id, credit_count, 'credited', NOW())
        ON CONFLICT (payment_transaction_id) DO NOTHING;

        INSERT INTO credit_wallets (user_id, balance, updated_at)
        VALUES (payment.user_id, credit_count, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET balance = credit_wallets.balance + EXCLUDED.balance,
            updated_at = NOW();

        INSERT INTO credit_transactions (user_id, delta, reason, reference_id, idempotency_key)
        VALUES (payment.user_id, credit_count, 'credit_purchase', payment.id, 'payment:' || payment.id::TEXT)
        ON CONFLICT (idempotency_key) DO NOTHING;

    ELSIF payment.purpose = 'subscription' THEN
        IF payment.salon_id IS NULL THEN
            RAISE EXCEPTION 'subscription_requires_salon';
        END IF;

        subscription_months := COALESCE((payment.metadata ->> 'months')::INT, 1);

        INSERT INTO subscriptions (salon_id, provider, amount_fcfa, status, expires_at)
        VALUES (
            payment.salon_id,
            payment.provider,
            payment.amount_fcfa,
            'active',
            NOW() + make_interval(months => subscription_months)
        );

        UPDATE salons
        SET plan = payment.product_id,
            updated_at = NOW()
        WHERE id = payment.salon_id;
    END IF;

    RETURN jsonb_build_object(
        'status', 'paid',
        'payment_id', payment.id,
        'purpose', payment.purpose,
        'provider', payment.provider
    );
END;
$$;

REVOKE ALL ON FUNCTION finalize_afrofade_payment(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_afrofade_payment(UUID, TEXT) TO service_role;
