# Smart University Parking Management and Reservation System

A production-minded, full-stack intelligent parking management and reservation platform designed specifically for university campuses.

Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **TiDB Cloud (MySQL-compatible)**, **Prisma ORM**, **Google OAuth (Auth.js)**, **Server-Sent Events (SSE)**, and **Firebase Cloud Messaging (FCM)**.

---

## 🚀 Key Features & Domain Invariants

1. **Multi-Category Serial Slots:**
   - Dedicated slots for **Bus** (`B01, B02...`), **Car** (`C01, C02...`), **Motorcycle / Bike** (`M01, M02...`), and **Other** (`O01, O02...`).
2. **Dual-Timer Reservation & Parking Lifecycle:**
   - **Arrival Grace Countdown:** Starts when a reservation is placed (default: 15 minutes). If vehicle does not arrive in time, marks as `NO_SHOW` and releases slot safely.
   - **Parking Duration Countdown:** Starts *only* when the attendant or QR scan confirms vehicle check-in (`ACTIVE`).
3. **Physical Exit Verification & Occupied Retention Invariant:**
   - A slot is **never** freed to `AVAILABLE` simply because a timer expires. Overstaying vehicles transition to `EXPIRED_AWAITING_EXIT` and remain `OCCUPIED` until an attendant confirms physical departure (`COMPLETED`).
4. **Zero Double-Booking Concurrency Protection:**
   - Atomic conditional transactions in TiDB with `SELECT ... FOR UPDATE` row locks guarantee absolute prevention of duplicate reservations.
5. **Real-Time Telemetry & Web Push:**
   - Server-Sent Events (SSE) with automatic reconnection and fallback polling for dashboard updates.
   - Firebase Cloud Messaging for Web Push notifications across all critical lifecycle events.
6. **Role-Based Access Control (RBAC):**
   - **Driver / User:** Vehicle management, slot browsing, booking, waiting list, active countdown HUD.
   - **Parking Attendant:** Assigned area management, QR code check-in & check-out, overstay handling.
   - **Admin:** Area & slot inventory, vehicle categories, duration policies, audit logs, and metrics.

---

## 🛠️ Technology Stack

- **Framework:** [Next.js](https://nextjs.org/) 14 (App Router) + TypeScript (Strict Mode)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database:** [TiDB Cloud](https://tidbcloud.com/) (Serverless MySQL-compatible relational database)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Authentication:** Google OAuth + Auth.js (NextAuth) with local demo credentials provider
- **Live Updates:** Server-Sent Events (SSE) with HTTP polling fallback
- **Push Notifications:** Firebase Cloud Messaging (Web Push)
- **Validation:** Zod schemas
- **Testing:** Vitest & Playwright

---

## 📂 Project Structure

```text
├── app/                  # Next.js App Router (pages, layouts, route handlers)
│   ├── api/              # REST endpoints & SSE streaming handlers
│   ├── auth/             # Authentication & sign-in screens
│   ├── driver/           # Driver dashboard & reservation flows
│   ├── attendant/        # Attendant portal & check-in/out workflows
│   ├── admin/            # Administrative portal & inventory management
│   ├── globals.css       # Tailwind base styles & theme tokens
│   └── layout.tsx        # Root HTML layout
├── components/           # Reusable UI components & shadcn primitives
├── lib/                  # Shared utilities (Zod env validation, formatting, cn)
├── server/               # Server-only domain services (Booking, Slot, Expiry, SSE, FCM)
├── prisma/               # Prisma schema, migrations, and seed scripts
├── schemas/              # Zod validation schemas for API inputs & outputs
├── tests/                # Vitest unit/integration tests & Playwright specs
├── public/               # Static assets & Firebase messaging service worker
├── .env.example          # Environment variables template
└── tsconfig.json         # Strict TypeScript compiler options
```

---

## 🏁 Getting Started Locally

### Prerequisites
- Node.js 18+ or 20+ (Node.js v22 LTS configured)
- npm or pnpm
- Git

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd "Smart University Parking Management and Reservation System"
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in the required keys:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Prepare the Database

Use a non-production TiDB database for local tests. Apply committed migrations, then restore deterministic demo data:

```bash
npx prisma migrate deploy
npm run db:seed
```

The seed/reset creates three one-click classroom identities:

- `driver@university.edu` → Driver
- `attendant@university.edu` → Attendant assigned to North Campus Main Lot
- `admin@university.edu` → Admin

Any custom email is always a Driver. Client input cannot grant Admin or Attendant access.

### 5. Run Tests & Typechecking

Database-independent regression suite:

```bash
npm run typecheck
npm test -- tests/setup.test.ts tests/schema.test.ts tests/auth.test.ts tests/sse.test.ts tests/booking-state.test.ts tests/waiting-list-state.test.ts tests/inventory-state.test.ts tests/notification-state.test.ts tests/demo-reset.test.ts
```

The integration suites are skipped unless `TEST_DATABASE_URL` is set because they create and delete rows. Run them only against a seeded disposable TiDB database:

```bash
TEST_DATABASE_URL='mysql://...' npm test
```

Never point `TEST_DATABASE_URL` at production.

## Vercel Deployment

1. Create a TiDB database and set `DATABASE_URL`.
2. Run `npx prisma migrate deploy`, then `npm run db:seed` against that database.
3. Add `NEXTAUTH_URL`, a random `NEXTAUTH_SECRET`, Google OAuth values if used, `CRON_SECRET`, and a separate random `RESET_SECRET` in Vercel.
4. Add Firebase and Gemini values only when those integrations are enabled.
5. Deploy, then verify Driver booking, assigned-area gate operations, expiry recovery, and the protected reset endpoint.

`vercel.json` schedules expiry recovery at midnight and the demo reset five minutes later. The application also expires missed arrivals on authoritative server reads, so correctness does not depend on a sub-15-minute cron plan. Confirm that your Vercel plan supports the configured cron schedules.

## Classroom Reset

Shared data persists during the day. The nightly reset deletes mutable demo data and recreates the deterministic users, areas, policies, slots, assignment, and sample vehicle. Vercel Cron calls `GET /api/cron/reset-demo` with `CRON_SECRET`; a manual reset uses `POST /api/cron/reset-demo` with `Authorization: Bearer <RESET_SECRET>`.

## Known Limitations

- The in-memory SSE event bus is instance-local. On Vercel, polling and server refetches are authoritative; SSE is only a best-effort latency optimization.
- Browser FCM setup still requires valid Firebase web configuration, a service worker, notification permission, and a real registration token. In-app notifications remain the fallback.
- One-click Admin and Attendant access is intentionally public for classroom bug testing. Do not reuse this authentication model for a real campus deployment.
- Review `npm audit` findings deliberately; do not run force upgrades without testing framework compatibility.
