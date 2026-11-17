---
description: Build, test, and deploy a Smart Parking Management System
  using Next.js, TypeScript, TiDB (MySQL), Prisma, Google OAuth, SSE,
  Firebase Cloud Messaging, and Vercel. Use for architecture,
  implementation, booking logic, notifications, security, testing, and
  deployment tasks in this project.
name: smart-parking-management
---

# Smart Parking Management System --- Project Skill

## Mission

Help build a reliable university parking management platform for buses,
cars, motorcycles, and configurable other vehicle categories. The system
manages serial-numbered parking slots, reservations, arrival/parking
time limits, expiry notifications, verified vehicle exits, waiting
lists, and admin operations.

## Fixed stack

-   Next.js App Router + TypeScript
-   Tailwind CSS + shadcn/ui
-   Node.js server-side logic through Next.js Route Handlers
-   TiDB Cloud (MySQL-compatible)
-   Prisma ORM
-   Google OAuth (Auth.js or an explicitly approved alternative)
-   Server-Sent Events (SSE) for live server-to-client updates
-   Firebase Cloud Messaging (FCM) for push notifications
-   Vercel hosting
-   Zod validation
-   Vitest and Playwright

Do not replace these technologies without explaining the reason and
obtaining approval.

## Core domain knowledge

### Vehicle categories and slot codes

-   Bus: B01, B02, ...
-   Car: C01, C02, ...
-   Motorcycle: M01, M02, ...
-   Other: O01, O02, ...

Vehicle categories and parking policies must be admin-configurable.

### Slot states

-   `AVAILABLE`
-   `RESERVED`
-   `OCCUPIED`
-   `MAINTENANCE`

### Booking states

Recommended lifecycle: - `PENDING_ARRIVAL` - `ACTIVE` -
`EXPIRED_AWAITING_EXIT` - `COMPLETED` - `CANCELLED` - `NO_SHOW`

Clearly distinguish reservation arrival grace time from actual parking
duration. Example demo defaults: Car 15 minutes, Motorcycle 15 minutes,
Bus 30 minutes, Other configurable. These are configurable sample
values, not universal rules.

## Non-negotiable business rules

1.  A slot must never be double-booked.
2.  Check availability again inside a database transaction.
3.  Use server-side UTC timestamps as the source of truth.
4.  Never rely on a browser countdown or in-memory `setTimeout()` for
    booking expiry.
5.  Store expiry timestamps in TiDB.
6.  A scheduled, authenticated, idempotent server process handles
    overdue bookings.
7.  A slot must not become `AVAILABLE` merely because the parking timer
    expires.
8.  If a vehicle is still physically present, keep the slot unavailable
    until an attendant, QR exit workflow, or approved sensor verifies
    departure.
9.  Waiting-list allocation must be fair and transactional.
10. Notifications should be sent after a successful state transition,
    with retry-safe handling.

## FCM skill

Use Firebase Cloud Messaging for: - Booking confirmation - Arrival
reminder - Parking time warning - Parking time expired - No-show
cancellation - Exit confirmation - Waiting-list allocation

Implementation requirements: - Register and refresh device/browser push
tokens. - Store tokens securely in the relational database. - Send
messages from trusted server-side code using Firebase Admin SDK. - Never
expose service-account credentials to the browser. - Handle permission
denial and unsupported browsers. - Remove invalid or revoked tokens. -
Provide in-app notification history separately if required.

FCM itself is listed as no-cost by Firebase. Other Firebase products,
Google Cloud services, hosting, database, and network costs may still
apply. Check current official pricing before promising that the entire
solution is free.

## SSE skill

Use SSE for one-way live updates while a page/app is open: - Parking
slot state changes - Booking state changes - Waiting-list changes -
Admin dashboard metrics

Use REST API calls for client-to-server commands such as booking and
cancellation.

SSE implementation must include: - Authenticated stream endpoint - Event
IDs where practical - Client reconnection - Refetch/recovery after
reconnect - Heartbeats compatible with hosting limits - Minimal,
non-sensitive event payloads - Polling fallback

Do not assume Vercel serverless functions provide unlimited permanent
connections. Verify current Vercel function duration and streaming
limits. If SSE reliability is insufficient, recommend a managed realtime
provider or a separate persistent service as an explicitly documented
alternative.

## TiDB and Prisma skill

-   Use relational modeling and foreign keys.
-   Add indexes for common lookups and due-expiry queries.
-   Add uniqueness constraints for slot identifiers and active
    reservation invariants where supported.
-   Use transactions for booking and waiting-list assignment.
-   Verify Prisma and migration compatibility with the selected TiDB
    version/plan.
-   Check TiDB-specific SQL/feature limitations before using advanced
    MySQL features.
-   Do not depend on MySQL triggers/events/stored procedures for the
    expiry scheduler.
-   Keep secrets in environment variables and provide `.env.example`.

## Authentication and authorization skill

-   Implement Google OAuth securely.
-   Verify the provider identity server-side.
-   Create or link the local user record safely.
-   Store roles in TiDB: `USER`, `ATTENDANT`, `ADMIN`.
-   Enforce role checks in every protected server operation.
-   Do not trust a role or user ID sent by the client.
-   Document secure admin bootstrap procedure.
-   Protect sessions/cookies and validate redirect URLs.

## Security and privacy

-   Validate input with Zod.
-   Enforce server-side RBAC.
-   Protect against IDOR, mass assignment, injection, CSRF, and XSS.
-   Rate-limit sensitive operations where feasible.
-   Avoid logging tokens, credentials, or unnecessary personal data.
-   Use audit logs for administrative and attendant actions.
-   Use server time for all booking calculations.

## Testing checklist

At minimum, test: - Google sign-in and sign-out - Role-based access -
Duplicate simultaneous booking attempts for one slot - Booking
cancellation - Arrival confirmation - Arrival grace timeout / no-show -
Parking duration expiry - Expired vehicle still present - Attendant exit
verification - Slot release only after verified exit - Waiting-list
allocation order - FCM permission denied / invalid token - SSE
disconnect and reconnect - Scheduler retry and idempotency - Admin
changes to duration policies

## Deployment skill

Deploy: - Next.js app and API routes to Vercel - Database to TiDB
Cloud - Push messaging through Firebase Cloud Messaging

Before deployment: 1. Configure production TiDB connection string. 2.
Run Prisma migrations safely. 3. Configure Google OAuth authorized
origins and redirect URLs. 4. Configure Firebase web app, service worker
and server-side Admin credentials. 5. Add all environment variables to
Vercel. 6. Configure a protected scheduled expiry endpoint using the
supported Vercel Cron plan/frequency. 7. Test production push
notifications and SSE reconnect behavior. 8. Verify logs, database
connectivity, booking concurrency and expiry recovery.

Never claim a free tier, feature, or deployment limit without checking
current official documentation.

## Required workflow

Work incrementally: 1. Clarify assumptions and unresolved rules. 2.
Present architecture and plan. 3. Set up repository and application. 4.
Configure TiDB and Prisma. 5. Implement Google authentication and RBAC.
6. Implement parking inventory. 7. Implement transactional booking
engine. 8. Implement expiry scheduler. 9. Implement FCM. 10. Implement
SSE and fallback. 11. Build user, attendant and admin screens. 12. Test
and review security. 13. Deploy. 14. Write documentation.

At the end of every phase: - List changed files. - Explain completed
functionality. - Run lint, typecheck, tests and build as appropriate. -
Report failures honestly. - Give local run commands. - Ask for approval
before proceeding.

## Coding standards

-   TypeScript strict mode.
-   Small, focused modules.
-   Clear names and beginner-readable code.
-   No fake success responses.
-   No hardcoded secrets.
-   No unimplemented core feature represented as complete.
-   Document assumptions and known limitations.
-   Prefer official provider documentation for changing SDK and hosting
    details.
