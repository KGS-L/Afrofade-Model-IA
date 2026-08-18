# Afrofade P1 — Role dashboards

This P1 makes the three authenticated Afrofade spaces role-aware and backed by real Supabase data.

## Roles and destinations

| Role | Route | Purpose |
|---|---|---|
| `customer` | `/account` | profile, credit wallet, credit ledger, credit purchases, salon onboarding |
| `salon` | `/dashboard` | salon profile, quotas, heads, subscription and payment history |
| `admin` | `/admin` | platform KPIs, users, salons, plans, paid revenue and recent salons |

The Next.js middleware verifies the Supabase session on the server and redirects users away from dashboards that do not match their database role.

## Required migration

After migrations `01`, `02` and `03`, run:

```text
web/supabase/migrations/04_role_dashboards.sql
```

Migration 04:

- creates `public.customer_profiles`;
- enables RLS for customer-owned profile rows;
- installs an `auth.users` trigger that provisions new users as `customer`;
- backfills users created before P1 without overwriting existing `admin` or `salon` roles.

### Verify migration 04

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'customer_profiles';
```

```sql
select trigger_name
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
  and trigger_name = 'on_afrofade_auth_user_created';
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
4. Profile edits are persisted in `customer_profiles`.
5. Credit balance comes from `credit_wallets`.
6. Credit history comes from `credit_transactions`.
7. Credit purchases come from `payment_transactions`.
8. Pack checkout uses server-side prices from `B2C_CREDIT_PACKS`.
9. After payment verification, `finalize_afrofade_payment` credits the wallet idempotently.

Money Fusion requires a valid phone number saved in the customer profile.

## Salon flow

A customer can create a salon from `/account`.

The authenticated `/api/salon/onboard` endpoint:

- creates a `salons` row;
- starts the salon on the `PRO` quota baseline;
- updates only the authenticated user's `user_profiles` row to `role = 'salon'`;
- refuses to convert an admin account.

After onboarding, the user is routed to `/dashboard`.

The salon dashboard reads and writes:

- `salons` for profile, plan and quota;
- `clients_heads` for stored heads;
- `subscriptions` for the active subscription;
- `payment_transactions` for billing history.

First-subscription discounts are re-validated on the server from the persisted salon profile and payment history. The client cannot choose its own discounted amount.

## Admin flow

`/api/admin/overview` requires a verified `admin` principal and returns real Supabase metrics:

- number of salons;
- role distribution;
- active subscriptions;
- paid transaction count;
- total verified revenue;
- subscription vs B2C credit revenue;
- plan distribution;
- latest salons and active-subscription status.

There are no hard-coded KPI or recent-salon fixtures in the P1 admin page.

## Payment provider rollout

Initial production configuration remains:

```env
PAYMENT_ENABLED_PROVIDERS=money_fusion
```

Money Fusion must be approved by the provider before live checkout can complete. A provider being unavailable must fail closed; Afrofade does not simulate a successful payment.

Customer credit payments return to `/account`. Salon subscription payments return to `/dashboard`.

## End-to-end verification checklist

### Customer

- sign in with a normal Supabase account;
- confirm `/dashboard` redirects to `/account`;
- edit name/phone/country and reload;
- confirm values persist;
- confirm wallet and transaction sections load from Supabase;
- initiate a credit pack checkout once Money Fusion is approved.

### Salon

- from `/account`, create a salon;
- confirm the account is routed to `/dashboard`;
- edit salon profile and reload;
- confirm profile persists in `salons`;
- confirm quota, heads and billing history are real;
- initiate a subscription checkout once Money Fusion is approved.

### Admin

- assign one account `role = 'admin'`;
- confirm `/account` and `/dashboard` redirect to `/admin`;
- confirm KPI values match Supabase tables;
- confirm recent salons are real rows.

### Security

Run the CI invariant check:

```bash
python3 scripts/check_p0_invariants.py
```

The script now covers both P0 security boundaries and P1 role-dashboard boundaries.
