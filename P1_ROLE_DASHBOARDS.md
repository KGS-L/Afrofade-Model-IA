# Afrofade P1 — Role dashboards end-to-end

P1 makes the three authenticated Afrofade spaces role-aware, backed by real Supabase data, and connected to the real reconstruction/payment usage flows.

## Roles and destinations

| Role | Route | Operational scope |
|---|---|---|
| `customer` | `/account` | persisted profile, credit wallet/ledger, credit purchases, render history, salon onboarding |
| `salon` | `/dashboard` | persisted salon profile, quota, generated heads, subscription and payment history |
| `admin` | `/admin` | real platform KPIs, roles, salons, subscriptions and verified revenue |

The Next.js middleware verifies the Supabase session on the server and redirects users away from dashboards that do not match their database role.

## Required migration

After migrations `01`, `02` and `03`, run:

```text
web/supabase/migrations/04_role_dashboards.sql
```

Migration 04 creates and configures:

- `customer_profiles`;
- `customer_heads`;
- RLS for customer-owned profile/render reads;
- safe automatic provisioning of new Supabase Auth users as `customer`;
- backfill for pre-P1 users without overwriting existing `admin` or `salon` roles;
- idempotent salon reconstruction keys;
- `finalize_customer_reconstruction(...)` — atomically stores a customer GLB and debits 2 credits;
- `finalize_salon_reconstruction(...)` — atomically stores a salon head and consumes 1 quota unit;
- `consume_customer_download_credit(...)` — atomically debits 1 credit for a B2C HD download.

### Verify migration 04

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('customer_profiles', 'customer_heads')
order by table_name;
```

```sql
select trigger_name
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
  and trigger_name = 'on_afrofade_auth_user_created';
```

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'finalize_customer_reconstruction',
    'finalize_salon_reconstruction',
    'consume_customer_download_credit'
  )
order by routine_name;
```

## Admin role

Admin remains an explicit database action and is never self-assigned by the browser.

```sql
insert into public.user_profiles (user_id, role, salon_id)
select id, 'admin', null::uuid
from auth.users
where lower(email) = lower('YOUR_ADMIN_EMAIL')
on conflict (user_id)
do update set
  role = 'admin',
  salon_id = null,
  updated_at = now();
```

## Customer flow

1. User signs in through Supabase Auth.
2. Migration 04 provisions `user_profiles.role = 'customer'`.
3. Middleware sends the user to `/account`.
4. Profile edits persist in `customer_profiles`.
5. Credit balance comes from `credit_wallets`; history comes from `credit_transactions`.
6. Pack checkout uses server-side prices from `B2C_CREDIT_PACKS`.
7. Money Fusion webhook finalization credits the wallet idempotently.
8. `/rituel` requires at least 2 credits before starting the real AI reconstruction.
9. A successful reconstruction is saved in `customer_heads` and debits 2 credits atomically.
10. The generated GLB is served only to its owner through the authenticated Next.js model proxy.
11. HD PNG download debits 1 additional credit atomically.

Money Fusion requires a valid phone number saved in the customer profile. Provider redirects are reconciled by polling the verified payment row/wallet for up to 30 seconds.

## Salon flow

A customer can create a salon from `/account`. The authenticated onboarding API creates the `salons` row and updates only that authenticated user's `user_profiles` row to `role = 'salon'`.

`/dashboard` reads and writes:

- `salons` for profile, plan and quota;
- `clients_heads` for generated heads;
- `subscriptions` for the active subscription;
- `payment_transactions` for billing history.

The real reconstruction endpoint requires both an active salon subscription and remaining quota. After successful AI generation, `finalize_salon_reconstruction` stores the head and increments `quota_used` in the same PostgreSQL transaction. Retries with the same request key do not consume quota twice.

First-subscription discounts are re-validated on the server from the persisted salon profile and paid payment history. Provider redirects are reconciled against the real subscription/payment state.

## Admin flow

`/api/admin/overview` requires a verified `admin` principal and returns real Supabase metrics:

- salons and users;
- role distribution;
- active subscriptions;
- paid transaction count;
- total verified revenue;
- subscription vs B2C credit revenue;
- plan distribution;
- latest salons and active-subscription state.

The admin UI contains no hard-coded KPI or recent-salon fixtures.

## Real 3D model lifecycle

- Browser scan frames are accepted as real `data:image/...;base64,...` inputs by the Python observation service.
- Invalid image inputs fail closed; the former synthetic-face fallback has been removed.
- The Next.js reconstruction proxy does not return a fake model when FastAPI fails.
- Generated GLB files live in the Docker volume `afrofade-generated-models` and survive container redeploys.
- Browser GLB access passes through `/api/v1/models/[filename]`, which verifies model ownership before proxying the internal FastAPI file.
- The biometric purge removes expired customer/salon database rows and their generated GLB files.

## Payment provider rollout

Initial production configuration remains:

```env
PAYMENT_ENABLED_PROVIDERS=money_fusion
```

Money Fusion live completion remains dependent on provider approval. Afrofade fails closed rather than simulating a successful payment.

## End-to-end verification checklist

### Customer

- sign in with a normal Supabase account;
- confirm `/dashboard` redirects to `/account`;
- edit profile and reload: values must persist;
- purchase credits once Money Fusion is approved;
- confirm the return page reconciles `pending → paid` and wallet balance;
- launch `/rituel` with at least 2 credits;
- confirm a real `customer_heads` row appears and exactly 2 credits are debited;
- download PNG and confirm exactly 1 additional credit is debited.

### Salon

- create a salon from `/account`;
- confirm routing to `/dashboard`;
- edit salon profile and reload;
- activate a subscription through Money Fusion once approved;
- launch `/rituel`;
- confirm a `clients_heads` row appears and `salons.quota_used` increases by exactly 1;
- retry protection must not double-consume quota.

### Admin

- assign one account `role = 'admin'`;
- confirm `/account` and `/dashboard` redirect to `/admin`;
- compare KPI values with Supabase tables;
- confirm recent salons and paid revenue are real rows.

### CI/security

```bash
python3 scripts/check_p0_invariants.py
```

The normal pipeline additionally performs npm audit, TypeScript validation, Next.js production build, Python compile, Docker production build/startup and security smoke tests.
