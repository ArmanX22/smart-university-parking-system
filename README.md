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

### 4. Run Tests & Typechecking
```bash
npm run typecheck
npm test
npm run lint
```
