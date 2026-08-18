-- Afrofade Database Migration 02: P0 security and commerce integrity

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'salon', 'admin')),
    salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('money_fusion')),
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('subscription', 'credits')),
    product_id VARCHAR(100) NOT NULL,
    term_id VARCHAR(20),
    amount_fcfa INT NOT NULL CHECK (amount_fcfa > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'XOF',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    provider_token TEXT UNIQUE,
    provider_transaction_id TEXT UNIQUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_wallets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    delta INT NOT NULL CHECK (delta <> 0),
    reason VARCHAR(50) NOT NULL,
    reference_id UUID,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_transaction_id UUID NOT NULL UNIQUE REFERENCES payment_transactions(id) ON DELETE RESTRICT,
    pack_id VARCHAR(100) NOT NULL,
    credits INT NOT NULL CHECK (credits > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    credited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_select_own ON user_profiles;
CREATE POLICY user_profiles_select_own ON user_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS payment_transactions_select_own ON payment_transactions;
CREATE POLICY payment_transactions_select_own ON payment_transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS credit_wallets_select_own ON credit_wallets;
CREATE POLICY credit_wallets_select_own ON credit_wallets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS credit_transactions_select_own ON credit_transactions;
CREATE POLICY credit_transactions_select_own ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS credit_purchases_select_own ON credit_purchases;
CREATE POLICY credit_purchases_select_own ON credit_purchases FOR SELECT USING (auth.uid() = user_id);

-- Atomic, idempotent commerce finalization. Only the service role may execute it.
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
        RETURN jsonb_build_object('status', 'already_paid', 'payment_id', payment.id);
    END IF;

    IF payment.status <> 'pending' THEN
        RAISE EXCEPTION 'payment_not_pending';
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
            'money_fusion',
            payment.amount_fcfa,
            'active',
            NOW() + make_interval(months => subscription_months)
        );

        UPDATE salons
        SET plan = payment.product_id,
            updated_at = NOW()
        WHERE id = payment.salon_id;
    END IF;

    RETURN jsonb_build_object('status', 'paid', 'payment_id', payment.id, 'purpose', payment.purpose);
END;
$$;

REVOKE ALL ON FUNCTION finalize_afrofade_payment(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_afrofade_payment(UUID, TEXT) TO service_role;

-- Only trusted server code (service role) mutates commerce tables.
-- No INSERT/UPDATE/DELETE policies are intentionally granted to authenticated clients.
