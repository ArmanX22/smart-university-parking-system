# MASTER BUILD PROMPT --- Smart Parking Management System

Act as a senior full-stack architect and engineer. Build a
production-minded, student-project-friendly **Smart Parking Management
System**. Work incrementally, explain decisions briefly, write working
code, run checks, and never pretend a feature is complete when it is
not.

## 1. Fixed technology decisions

-   **Web application:** Next.js (App Router) + TypeScript
-   **UI:** Tailwind CSS + shadcn/ui
-   **Backend:** Next.js Route Handlers / server-side services using
    Node.js + TypeScript
-   **Database:** TiDB Cloud (MySQL-compatible)
-   **ORM:** Prisma
-   **Authentication:** Google OAuth using Auth.js (or a clearly
    justified alternative); verify identity on the server
-   **Live in-app updates:** Server-Sent Events (SSE) where supported,
    with reconnect and recovery; use polling as a fallback
-   **Push notifications:** Firebase Cloud Messaging (FCM)
-   **Hosting:** Vercel
-   **Version control:** GitHub
-   **Validation:** Zod
-   **Testing:** Vitest for unit/integration tests and Playwright for
    key browser flows

Do not introduce MongoDB, Socket.IO, Redis, or another database unless a
real technical limitation is explained and approved first. FCM is
no-cost according to Firebase's published pricing, but other
Firebase/Google services, hosting, database tiers, network egress, and
third-party services may have separate charges. Do not promise that the
entire system is free.

## 2. Product goal

Create a parking management and reservation platform for: - Bus - Car -
Motorcycle / Bike - Other vehicles (admin-configurable)

The system should organize parking spaces by area and serial-numbered
slots, let users view availability and reserve a suitable slot, enforce
vehicle-category parking durations, notify users before/when time
expires, verify actual vehicle exit, and release a slot only when it is
physically free.

## 3. User roles and permissions

Implement role-based access control for: 1. **Driver/User:** manage
profile and vehicles, browse slots, book/cancel reservations, view
active booking and history, receive notifications, join a waiting list.
2. **Parking Attendant:** view assigned parking area, verify
arrival/entry and departure/exit, scan booking QR code or search
booking, report exceptions. 3. **Admin:** manage users, attendants,
parking areas, slot inventory, vehicle categories, duration policies,
bookings, waiting lists, reports, and system settings.

Enforce permissions on the server for every protected operation. Never
rely only on hiding frontend buttons.

## 4. Core parking and booking rules

### Slot identifiers

Use configurable serials, for example: - Bus: B01, B02, B03 - Car: C01,
C02, C03 - Motorcycle: M01, M02, M03 - Other: O01, O02, O03

A slot has one of these states: - `AVAILABLE` - `RESERVED` -
`OCCUPIED` - `MAINTENANCE`

### Vehicle duration policies

Create editable defaults for demonstration only: - Car: 15 minutes -
Motorcycle: 15 minutes - Bus: 30 minutes - Other: configurable by Admin

Admin can change these values. Store the applied duration and expiry
timestamp on each booking so later policy changes do not silently alter
an existing booking.

### Reservation lifecycle

Implement an explicit, documented state machine. Suggested booking
states: - `PENDING_ARRIVAL` (slot reserved; arrival grace countdown
running) - `ACTIVE` (attendant/QR verifies arrival; parking duration
begins) - `EXPIRED_AWAITING_EXIT` (allowed parking duration elapsed, but
vehicle exit not yet verified) - `COMPLETED` (exit verified; slot
released) - `CANCELLED` - `NO_SHOW` (arrival grace period elapsed
without arrival)

Clarify the product distinction between: - **Arrival grace period**
after a reservation is made (e.g. 10--15 minutes), and - **Parking
duration** after the vehicle actually enters (e.g. Car 15 minutes).

Do not conflate the two. Make both configurable by Admin. If the project
chooses not to have an arrival grace period in its first release,
document that explicitly.

### Critical safety/correctness rule

Never set a slot to `AVAILABLE` merely because a timer expired. If the
vehicle is physically present, the slot remains `OCCUPIED` (or otherwise
unavailable) until an attendant, QR exit flow, or approved sensor
confirms departure. On parking-duration expiry, send notifications and
alert the attendant; release the slot only after exit verification.

### Concurrency

Prevent double booking: - Use database transactions and appropriate
unique constraints/locking strategy supported by TiDB. - Re-check slot
availability inside the transaction. - Ensure two simultaneous booking
requests cannot reserve the same slot. - Process waiting-list allocation
transactionally and fairly. - Add idempotency protections for repeated
booking/exit requests.

## 5. Notifications and live updates

### Firebase Cloud Messaging

Implement FCM for web push notifications: - Booking confirmation -
Arrival reminder - Parking time nearly expired - Parking time expired -
No-show cancellation - Exit confirmation - Waiting-list allocation

Include client permission flow, service worker, token
registration/update/removal, and secure server-side sending using
Firebase Admin SDK. Never expose service-account credentials or FCM
server credentials to the browser. Handle denied permission and
unsupported browsers gracefully.

### SSE

Use SSE for live updates while the dashboard/app is open: - Slot
availability changes - Booking state changes - Queue/waiting-list
changes - Admin dashboard counts

SSE is one-way server-to-client. Use normal REST requests for booking
and other client-to-server commands. Implement: - authenticated stream
access - event IDs where practical - reconnect handling -
recovery/refetch after reconnect - heartbeat/keep-alive compatible with
the deployment platform - no sensitive data in broadcast events

Vercel functions have execution and streaming constraints. Do not assume
an unlimited, permanent SSE connection. Verify current Vercel limits and
implement reconnect + polling fallback. If reliable long-lived live
streaming cannot be achieved within the selected Vercel plan/runtime,
isolate the event-stream service behind an adapter and document an
optional managed provider or separate persistent service as a future
deployment alternative. Do not silently change the selected
architecture.

## 6. Booking expiry and scheduled processing on Vercel

Do not use browser timers or in-memory `setTimeout()` as the source of
truth. Store UTC timestamps such as `arrivalExpiresAt` and
`parkingExpiresAt` in TiDB.

Implement idempotent server-side expiry processing: - A protected
scheduled endpoint invoked by Vercel Cron (or another documented
scheduler). - Secure it with a secret such as `CRON_SECRET`. - Query due
records in bounded batches. - Process each record transactionally and
idempotently. - Send notifications only after successful state
transitions. - Record processing outcomes and retry failures safely. -
Ensure missed scheduler runs are recovered by processing all overdue
records on the next run. - Document Vercel Cron frequency/plan limits
and any limitations. Never claim exact-minute execution if the chosen
plan cannot guarantee it.

For a small academic demo, provide a manual Admin "Run expiry check"
action in a protected environment as a testing aid, not as the
production scheduler.

## 7. Database design

Design a normalized relational schema in Prisma for at least: - User -
Account / OAuth identity (as required by Auth.js) - Vehicle -
ParkingArea - ParkingSlot - VehicleCategory - ParkingPolicy /
DurationPolicy - Booking - WaitingListEntry - DevicePushToken -
Notification - AuditLog

Include: - primary and foreign keys - useful indexes - unique
constraints (e.g. slot code within an area) - timestamps - enum/status
definitions - soft-delete only where justified

Use TiDB-compatible Prisma configuration and migrations. Check TiDB
compatibility for chosen Prisma features and SQL syntax. Provide
`.env.example` without real secrets. Never commit `.env`.

## 8. Required application screens

### Public/auth

-   Landing page
-   Google sign-in
-   Access denied / role guidance

### Driver

-   Dashboard with vehicle selector
-   Parking areas and slot map/list
-   Slot details and booking confirmation
-   Active reservation with server-derived countdown
-   Notification center
-   Booking history
-   Vehicle management
-   Profile

### Attendant

-   Assigned parking area
-   Search/scan booking
-   Confirm vehicle arrival
-   Confirm vehicle exit
-   Expired bookings needing attention

### Admin

-   Overview metrics
-   Parking areas and slot CRUD
-   Vehicle categories and duration policies
-   Users and attendants
-   Booking management
-   Waiting list
-   Notifications / audit log
-   Basic reports

Make the interface responsive, accessible, and suitable for a university
demo. Use clear empty, loading, error, and permission-denied states.

## 9. API and architecture requirements

Use a clean modular structure: - `app/` for Next.js routes and pages -
`components/` - `lib/` for shared utilities - `server/` for server-only
services - `prisma/` for schema and migrations - `schemas/` for Zod
validation - `tests/` - `public/` for service worker/assets

Separate route handlers, validation, business services,
repositories/data access, notification adapters, scheduler logic, and
authorization. Keep Firebase Admin code server-only.

Document the main REST endpoints and response/error shapes. Use
consistent HTTP status codes and structured error handling.

## 10. Security, privacy, and reliability

-   Validate all input with Zod.
-   Enforce RBAC server-side.
-   Verify Google identity and allowed account status server-side.
-   Protect against CSRF where relevant, XSS, injection, IDOR, and mass
    assignment.
-   Rate-limit login-sensitive and booking endpoints where feasible.
-   Do not leak secrets or private user/vehicle data in SSE events or
    logs.
-   Store only necessary personal data.
-   Use secure cookie/session settings.
-   Add audit logs for admin and attendant actions.
-   Handle duplicate FCM tokens and token revocation.
-   Use server UTC time for all booking calculations.
-   Provide clear error messages without exposing internal details.

## 11. Step-by-step development protocol (MANDATORY)

Build in the following phases. Do not jump ahead. At the end of each
phase: 1. Summarize files created/changed. 2. Explain what works. 3. Run
relevant lint, typecheck, tests, and build. 4. Report exact failures
honestly. 5. Give the commands to run locally. 6. Ask for approval
before moving to the next phase.

### Phase 0 --- Clarify assumptions and plan

List assumptions, identify unresolved business rules (especially arrival
grace vs parking duration and exit verification), propose architecture
and milestones. Do not code until the plan is approved.

### Phase 1 --- Repository and project setup

Create Next.js TypeScript project, install dependencies, configure
Tailwind/shadcn, ESLint, formatting, environment validation, folder
structure, README and `.env.example`.

### Phase 2 --- TiDB and Prisma

Create schema, configure TiDB connection, generate client, run
migrations, seed demo parking areas/slots/categories/policies. Verify
connection.

### Phase 3 --- Google authentication and RBAC

Implement sign-in, sessions, user provisioning, roles, protected routes
and server authorization. Include admin bootstrap instructions.

### Phase 4 --- Parking inventory

Implement parking areas, vehicle categories, serial slots, slot status
and admin CRUD. Add tests.

### Phase 5 --- Booking engine

Implement transactional booking, cancellation, arrival confirmation,
exit verification, waiting list and concurrency protections. Add
state-transition tests.

### Phase 6 --- Timers and expiry scheduler

Implement UTC timestamps, countdown UI derived from server data,
protected cron endpoint, idempotent batch processing, retry/error logs
and manual test action.

### Phase 7 --- FCM notifications

Configure Firebase web app, service worker, token registration,
server-side Firebase Admin sending and notification preferences. Test
each notification scenario.

### Phase 8 --- SSE live updates

Implement authenticated SSE, event publishing, reconnect/recovery and
polling fallback. Test multi-user slot updates. Verify deployment
compatibility.

### Phase 9 --- User, attendant and admin UI

Complete responsive screens and role-specific workflows. Connect all
screens to real APIs; no fake static-only functionality.

### Phase 10 --- Testing and security review

Unit, integration and end-to-end tests for auth, double booking, booking
expiry, no-show, occupied slot retention, exit verification, waiting
list and notifications.

### Phase 11 --- Deployment

Deploy to Vercel, connect TiDB Cloud, configure Google OAuth redirect
URLs, Firebase project and web push credentials, environment variables,
cron configuration, domain and production checks. Provide a deployment
checklist and rollback notes.

### Phase 12 --- Final documentation

Produce README, architecture overview, ERD, API documentation, setup
guide, demo accounts/seed instructions, test report, known limitations
and presentation/demo script.

## 12. Development rules

-   Use real working integrations, not fake buttons or hardcoded
    success.
-   Do not put secrets in source code.
-   Do not skip tests for booking concurrency and expiry.
-   Keep the code beginner-readable and explain important decisions.
-   Prefer simple, maintainable solutions over unnecessary complexity.
-   If a service requires a paid plan, explain that before relying on it
    and offer a no-cost-compatible alternative where possible.
-   Check official current documentation when a provider limit, SDK, or
    deployment behavior may have changed.
-   Never claim deployment succeeded unless it has actually been
    verified.

Start with **Phase 0 only**. First present assumptions, architecture,
unresolved decisions, and a phased plan. Wait for approval before
writing code.
