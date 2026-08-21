---
title: "Afrofade — BMAD Brainstorming Decision D08: Geolocation & Local Discovery"
status: accepted
created: 2026-08-21
branch: agent/bmad-marketplace-booking-careers-vision
parent_decision_log: _bmad-output/planning-artifacts/brainstorming-decisions-2026-08-21-marketplace-booking-careers.md
---

# D08 — Geolocation is contextual, permission-based and privacy-aware

**Status:** ACCEPTED

Afrofade uses location as a core marketplace signal for nearby discovery and booking, but it must not require permanent storage or public exposure of a customer's precise GPS position.

## 1. Customer / consumer location

A customer can authorize device geolocation to search nearby salons and eligible independent professionals.

The preferred flow is:

```text
User opens nearby discovery
      ->
Afrofade requests location permission
      ->
Current coordinates are used for the search
      ->
Nearby providers are ranked/filterable by distance + relevance
```

Precise customer coordinates are contextual search input by default, not a permanent public profile attribute.

If geolocation permission is refused or unavailable, Afrofade must provide a manual fallback such as:

- city;
- neighborhood / district;
- named area;
- map search / chosen point where supported.

Afrofade must not block marketplace discovery merely because the user refuses precise GPS permission.

## 2. Salon location

A salon/location is a public business place and should support a precise geocoded location, including at least:

- latitude / longitude;
- public address or useful location description;
- city;
- neighborhood / district;
- service/business metadata necessary for map discovery.

Each physical salon in a multi-location business has its own location record. Search and booking always resolve to the concrete location being booked.

## 3. Independent professional location

An independent professional must not be forced to expose a private home address.

Afrofade supports public discovery through one or more of:

- city;
- neighborhood;
- service zone;
- travel radius;
- mobile / at-home service area;
- approximate map area when appropriate.

If a precise private appointment location is required, it is revealed only according to the booking workflow and privacy policy, not automatically on the public profile.

## 4. Nearby discovery model

Local ranking must not be based on distance alone.

The marketplace should be architected so ranking/filtering can combine signals such as:

```text
location / distance
+ service match
+ hairstyle / skill match
+ availability
+ verified reputation
+ price range
+ provider eligibility / active entitlement
```

The exact ranking formula is not fixed by D08 and can evolve with marketplace evidence.

A nearby professional who does not provide the requested service should not outrank a slightly farther provider who has a strong verified skill/service match simply because of distance.

## 5. 3D-to-local-discovery differentiation

When a customer has selected or created a hairstyle look in Afrofade, local discovery should eventually be able to use that style as part of the search context.

Target experience:

```text
Customer tries hairstyle X in 3D
      ->
Afrofade knows the hairstyle/service taxonomy
      ->
Find nearby salons/professionals eligible for X
      ->
Filter/rank by distance + skill + availability + reputation
      ->
Book and attach the saved try-on as the visual brief
```

This connection between visual intent and local provider discovery is a core product differentiator and should be preserved in future PRD/architecture work.

## 6. Data and architecture consequence

The future architecture should support geospatial queries rather than treating locations as plain text only.

For the current Supabase/Postgres stack, the design should be compatible with Postgres geospatial capabilities (for example PostGIS or an equivalent supported approach) for radius/distance queries and indexes when implementation begins.

Location entities should be separated conceptually:

```text
SalonLocation
  -> precise public business point

ProfessionalServiceArea
  -> public service geography / radius / zones

CustomerSearchLocation
  -> contextual query input, precise only with user permission
```

## 7. Privacy and security consequences

- never publicly expose a customer's precise location;
- do not expose an independent professional's private home coordinates by default;
- request browser/device location permission only when location-dependent functionality needs it;
- allow manual location fallback;
- minimize retention of precise customer coordinates unless a concrete feature requires persistence;
- booking records may store necessary service-location references under access controls, but those records are not public marketplace data;
- location permissions and privacy rules must be considered in the future PRD and threat/privacy review.

## 8. Product conclusion

Location is a first-class Afrofade marketplace capability, but the product principle is:

> **Use the minimum location precision necessary for the user task.**

Customers can discover nearby providers without surrendering permanent precise-location privacy; salons expose their real business locations; independent professionals can operate through service areas; and the future matching engine combines geography with actual hair-service skill and availability.
