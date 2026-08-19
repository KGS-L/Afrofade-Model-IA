# BMAD Product Hardening Gate — before Story 7.6

Date: 2026-08-19
Status: in-progress

## Objective

Close product-operability gaps discovered after Story 7.5 before starting the head-job integration story.

## Acceptance criteria

1. Admin dashboard is an application overview, not a read-only KPI page.
2. Salons, active subscriptions, users and paid revenue KPI cards open dedicated detail views.
3. Money Fusion and GeniusPay are visible to admins with persistent enable/disable switches.
4. Checkout rejects a provider disabled by admin or missing from the server configuration allow-list.
5. Customer and salon profile updates persist and validate a controlled country selection.
6. New users choose Particulier or Salon before entering any role dashboard.
7. Existing configured accounts are not forced through onboarding again.
8. Customer scan requires face + right profile + left profile; neck scan is reserved for salon-assisted capture.
9. Scanner gives live feedback for camera readiness, lighting, movement and stability instead of a static ring.
10. Role dashboards and detail routes show skeleton states while data is loading.
11. Existing P0/P1 security, commerce and durable-head gates remain green.
