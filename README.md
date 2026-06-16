# 🏢 Meeting Room Booking System

A full-stack meeting room booking application built with **Next.js**, **Node.js/Express**, and **MongoDB**. The system enforces concurrency-safe bookings at the database level, meaning two people can never double-book the same room even if they click "Book" at the exact same instant.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Seeding the Database](#seeding-the-database)
- [Concurrency Test](#concurrency-test)
- [Deployment](#deployment)
- [Core Design Decisions](#core-design-decisions)

---

## ✨ Features

- **Room availability grid** — 48 slots per day (30-minute intervals, 24/7)
- **Multi-slot booking** — select one or more consecutive slots in a single booking
- **Concurrency-safe** — database-level unique index prevents double-booking under simultaneous requests
- **Refund-window logic** — cancel ≥2 hours before start → refundable; otherwise non-refundable (server clock only, no client timestamp)
- **Instant slot release** — cancelling a booking immediately frees those slots for others
- **Email-based lookup** — no auth needed; users find their bookings by email
- **Consistent availability** — the grid and the booking engine read from the exact same data source

---

## 🛠 Tech Stack

### Backend

| Technology     | Version | Purpose                                                  |
| -------------- | ------- | -------------------------------------------------------- |
| **Node.js**    | v18+    | Runtime                                                  |
| **Express**    | v5      | HTTP server and routing                                  |
| **TypeScript** | v6      | Type safety across the entire codebase                   |
| **MongoDB**    | v6+     | Primary database                                         |
| **Mongoose**   | v9      | MongoDB ODM — schemas, models, indexes                   |
| **tsx**        | v4      | Run TypeScript directly in development (no compile step) |
| **dotenv**     | v17     | Environment variable management                          |
| **cors**       | v2      | Cross-origin request handling                            |
| **morgan**     | v1      | HTTP request logging                                     |

### Frontend

| Technology       | Version | Purpose                         |
| ---------------- | ------- | ------------------------------- |
| **Next.js**      | v14     | React framework with App Router |
| **React**        | v18     | UI library                      |
| **TypeScript**   | v5      | Type safety                     |
| **Tailwind CSS** | v3      | Utility-first styling           |
| **clsx**         | v2      | Conditional class name merging  |
| **date-fns**     | v3      | Date formatting utilities       |

### Database

| Technology              | Purpose                                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| **MongoDB Atlas**       | Hosted MongoDB (free M0 tier works)                                        |
| **SlotLock collection** | The concurrency guard — unique compound index on `(room, date, slotStart)` |

---

## 📁 Project Structure

```
meeting-room-booking/
├── meeting-room-backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts          # MongoDB connection + transaction support detection
│   │   │   └── seed.ts              # Database seeder — 4 rooms + realistic bookings
│   │   ├── controllers/
│   │   │   ├── roomController.ts    # GET /rooms, GET /rooms/:id/availability
│   │   │   └── bookingController.ts # POST /bookings, GET /bookings, PATCH /bookings/:id/cancel
│   │   ├── middleware/
│   │   │   └── requestLogger.ts     # Per-request ID logging (useful for concurrency debugging)
│   │   ├── models/
│   │   │   ├── Room.ts              # Room schema
│   │   │   └── Booking.ts           # Booking schema + SlotLock schema (with unique index)
│   │   ├── routes/
│   │   │   ├── rooms.ts             # Room routes
│   │   │   └── bookings.ts          # Booking routes
│   │   ├── types/
│   │   │   └── index.ts             # Shared TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── slots.ts             # Slot generation, time math utilities
│   │   │   ├── errors.ts            # Custom error classes + global error handler
│   │   │   ├── response.ts          # Consistent API response helpers
│   │   │   └── concurrencyTest.ts   # Script to demo the double-booking guard
│   │   ├── app.ts                   # Express app setup — middleware, routes
│   │   └── server.ts                # Entry point — connects DB, starts server
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── meeting-room-frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx            # Root layout with sidebar
    │   │   ├── globals.css           # Tailwind base + custom slot grid styles
    │   │   ├── page.tsx              # Home — room listing
    │   │   ├── rooms/[id]/
    │   │   │   └── page.tsx          # Room availability page
    │   │   └── bookings/
    │   │       └── page.tsx          # My bookings page
    │   ├── components/
    │   │   ├── layout/
    │   │   │   └── Sidebar.tsx       # Navigation sidebar
    │   │   ├── rooms/
    │   │   │   ├── RoomCard.tsx               # Room summary card
    │   │   │   ├── RoomAvailabilityClient.tsx # Main availability + booking flow
    │   │   │   ├── SlotGrid.tsx               # 48-slot time grid
    │   │   │   └── DatePicker.tsx             # 14-day quick-pick + custom date input
    │   │   ├── bookings/
    │   │   │   ├── BookingsClient.tsx  # Email lookup + booking list
    │   │   │   ├── BookingCard.tsx     # Single booking row with cancel button
    │   │   │   └── CancelModal.tsx     # Cancel confirmation with refund preview
    │   │   └── ui/
    │   │       ├── Button.tsx
    │   │       ├── Input.tsx
    │   │       ├── Alert.tsx
    │   │       ├── Skeleton.tsx
    │   │       └── StatusBadge.tsx
    │   ├── lib/
    │   │   ├── api.ts      # All fetch calls to the backend
    │   │   └── dates.ts    # Date/time formatting utilities
    │   └── types/
    │       └── index.ts    # Shared TypeScript types
    ├── .env.local.example
    ├── next.config.ts
    ├── tailwind.config.ts
    └── tsconfig.json
```

---

## ⚙️ How It Works

### Concurrency Safety — No Double Booking

The system uses a dedicated `SlotLock` MongoDB collection with a **compound unique index** on `(room, date, slotStart)`. When a booking is created, one `SlotLock` document is inserted per 30-minute slot. If two requests race for the same slot, MongoDB's storage engine ensures exactly one insert succeeds — the other receives a duplicate key error (`11000`) which the API returns as a clean `409 Conflict`.

This is fundamentally safer than "read, then write" because there is no gap between checking and claiming.

```
Request A  ──────────────────► SlotLock.create("09:00") ── ✅ wins
Request B  ──────────────────► SlotLock.create("09:00") ── ❌ 11000 → 409
```

### Refund Window

When a booking is cancelled, the server computes `bookingStartTime - Date.now()` using its own clock. If the result is ≥ 2 hours the status becomes `cancelled-refundable`, otherwise `cancelled-non-refundable`. The client sends only the booking ID — no timestamp input is accepted.

### Availability Consistency

Both the availability grid (`GET /rooms/:id/availability`) and the booking creation (`POST /bookings`) read from and write to the same `SlotLock` collection. A slot shown as available **will** be bookable — the only way it could fail is if another request wins the race in the microseconds between the read and the write, which the unique index catches and surfaces as a 409.

---

## ✅ Prerequisites

Make sure you have these installed before starting:

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **npm** v9 or higher (comes with Node.js)
- **MongoDB** — either:
  - Local: [Install MongoDB Community](https://www.mongodb.com/try/download/community)
  - Cloud: [MongoDB Atlas free tier](https://www.mongodb.com/atlas) (recommended)
- **Git** — [git-scm.com](https://git-scm.com)

Verify your setup:

```bash
node --version   # should be v18+
npm --version    # should be v9+
```

---

## 🚀 Local Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-username/meeting-room-booking.git
cd meeting-room-booking
```

### Step 2 — Set up the Backend

```bash
cd meeting-room-backend

# Install dependencies
npm install

# Copy the environment file
cp .env.example .env
```

Open `.env` and set your MongoDB URI (see [Environment Variables](#environment-variables) below):

```bash
# .env
MONGODB_URI=mongodb://localhost:27017/meeting-room-booking
PORT=5000
NODE_ENV=development
```

Seed the database with 4 rooms and sample bookings:

```bash
npm run seed
```

Start the development server:

```bash
npm run dev
```

The backend will be running at **http://localhost:5000**

Verify it's working:

```bash
curl http://localhost:5000/health
# → { "status": "ok", ... }

curl http://localhost:5000/api/rooms
# → { "success": true, "data": [...4 rooms] }
```

---

### Step 3 — Set up the Frontend

Open a new terminal:

```bash
cd meeting-room-frontend

# Install dependencies
npm install

# Copy the environment file
cp .env.local.example .env.local
```

`.env.local` should contain:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the development server:

```bash
npm run dev
```

The frontend will be running at **http://localhost:3000**

---

### Step 4 — Open the app

| URL                             | Page                          |
| ------------------------------- | ----------------------------- |
| http://localhost:3000           | Room listing                  |
| http://localhost:3000/rooms/:id | Availability grid + booking   |
| http://localhost:3000/bookings  | My bookings (lookup by email) |
| http://localhost:5000/health    | Backend health check          |
| http://localhost:5000/api/rooms | API — list rooms              |

---

## 🔑 Environment Variables

### Backend — `.env`

| Variable      | Required | Default                 | Description                     |
| ------------- | -------- | ----------------------- | ------------------------------- |
| `MONGODB_URI` | ✅ Yes   | —                       | MongoDB connection string       |
| `PORT`        | No       | `5000`                  | Port the server listens on      |
| `NODE_ENV`    | No       | `development`           | `development` or `production`   |
| `CORS_ORIGIN` | No       | `http://localhost:3000` | Comma-separated allowed origins |

**Local MongoDB:**

```
MONGODB_URI=mongodb://localhost:27017/meeting-room-booking
```

**MongoDB Atlas:**

```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/meeting-room-booking?retryWrites=true&w=majority
```

> ⚠️ If your Atlas password contains special characters like `@`, `#`, or `!`, URL-encode them. For example `p@ss` becomes `p%40ss`.

### Frontend — `.env.local`

| Variable              | Required | Description      |
| --------------------- | -------- | ---------------- |
| `NEXT_PUBLIC_API_URL` | ✅ Yes   | Backend base URL |

```bash
# Local development
NEXT_PUBLIC_API_URL=http://localhost:5000

# Production (after deploying backend to Render)
NEXT_PUBLIC_API_URL=https://your-app.onrender.com
```

---

## 📡 API Reference

### Rooms

#### `GET /api/rooms`

Returns all rooms.

```bash
curl http://localhost:5000/api/rooms
```

```json
{
  "success": true,
  "data": [
    {
      "_id": "6671a...",
      "name": "Boardroom Alpha",
      "location": "North Wing",
      "floor": "4th Floor",
      "capacity": 14,
      "amenities": ["Projector", "Whiteboard", "Video Conferencing"]
    }
  ]
}
```

---

#### `GET /api/rooms/:id/availability?date=YYYY-MM-DD`

Returns the 48-slot availability grid for a room on a given date.

```bash
curl "http://localhost:5000/api/rooms/6671a.../availability?date=2025-06-16"
```

```json
{
  "success": true,
  "data": {
    "room": { "name": "Boardroom Alpha", ... },
    "date": "2025-06-16",
    "slots": [
      { "start": "09:00", "end": "09:30", "available": false, "bookedBy": "Priya", "title": "Standup" },
      { "start": "09:30", "end": "10:00", "available": true },
      ...
    ],
    "summary": { "total": 48, "available": 44, "booked": 4 }
  }
}
```

---

#### `POST /api/bookings`

Create a booking for one or more consecutive slots.

```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "6671a...",
    "date": "2025-06-17",
    "startTime": "14:00",
    "endTime": "15:30",
    "bookedBy": { "name": "Jane Smith", "email": "jane@company.com" },
    "title": "Product Review"
  }'
```

**Success `201`:**

```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": { "_id": "...", "status": "confirmed", ... }
}
```

**Conflict `409`** (slot already taken):

```json
{
  "success": false,
  "error": "One or more requested time slots are already booked.",
  "code": "BOOKING_CONFLICT"
}
```

---

#### `GET /api/bookings?email=user@example.com`

Returns all bookings for the given email address.

```bash
curl "http://localhost:5000/api/bookings?email=jane@company.com"
```

---

#### `PATCH /api/bookings/:id/cancel`

Cancel a booking. Refund status is computed server-side based on time until start.

```bash
curl -X PATCH http://localhost:5000/api/bookings/6671a.../cancel
```

**Success `200`:**

```json
{
  "success": true,
  "message": "Cancelled with refund",
  "data": {
    "booking": { "status": "cancelled-refundable", ... },
    "refundable": true,
    "hoursUntilStart": 3.5,
    "slotsFreed": 2,
    "message": "Booking cancelled with full refund (cancelled 3.5 hours before start)."
  }
}
```

---

### Error responses

All errors follow the same shape:

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

| HTTP Status | Code               | Meaning                                      |
| ----------- | ------------------ | -------------------------------------------- |
| `400`       | `VALIDATION_ERROR` | Missing or invalid fields                    |
| `400`       | `BAD_REQUEST`      | e.g. cancelling an already-cancelled booking |
| `404`       | `NOT_FOUND`        | Room or booking doesn't exist                |
| `409`       | `BOOKING_CONFLICT` | Slot already taken                           |
| `500`       | `INTERNAL_ERROR`   | Unexpected server error                      |

---

## 🌱 Seeding the Database

```bash
cd meeting-room-backend
npm run seed
```

This creates:

- **4 rooms** — Boardroom Alpha, Focus Room Beta, Innovation Lab Gamma, Huddle Space Delta
- **~13 bookings** spread across yesterday, today, tomorrow, and the day after
- **SlotLock documents** for every confirmed booking

Importantly, three of today's bookings are seeded at times **relative to when you run the seed**, so you can test the refund window immediately:

```
✅ Priya Sharma    → starts in ~1 hour  → cancel now = NON-REFUNDABLE
✅ James Okafor   → starts in ~3 hours → cancel now = REFUNDABLE
✅ Mei-Lin Zhang  → starts in ~4 hours → cancel now = REFUNDABLE
```

The seed output tells you exactly which emails and times to use:

```
Bookings for REFUND WINDOW TESTING (today = 2025-06-16):
  • Priya Sharma in Boardroom Alpha @ 15:00–15:30
    → Cancel NOW = NON-REFUNDABLE (starts in ~1 hour)
  • James Okafor in Focus Room Beta @ 17:00–17:30
    → Cancel NOW = REFUNDABLE (starts in ~3 hours)
```

Test the refund rule:

```bash
# Get Priya's booking ID
curl "http://localhost:5000/api/bookings?email=priya.sharma@acmecorp.com"

# Cancel it — will be non-refundable
curl -X PATCH http://localhost:5000/api/bookings/<id>/cancel
```

> ⚠️ The seed wipes all existing data every time it runs. Don't run it in production after real users have made bookings.

---

## ⚡ Concurrency Test

This script proves the double-booking guard works under real simultaneous load.

```bash
cd meeting-room-backend
npm run test:concurrency
```

It fires **10 simultaneous POST /api/bookings requests** for the exact same room and time slot using `Promise.allSettled`.

Expected output:

```
╔══════════════════════════════════════════════════════╗
║       CONCURRENCY DOUBLE-BOOKING TEST                ║
╚══════════════════════════════════════════════════════╝

✅ Server is up: http://localhost:5000
🏢 Testing with room: Boardroom Alpha (6671a...)
📅 Target slot: 2025-06-17 23:00–23:30
🔥 Firing 10 simultaneous requests...

✅ Request #4: CREATED (201ms)
🚫 Request #1: CONFLICT — One or more requested time slots are already booked.
🚫 Request #2: CONFLICT — One or more requested time slots are already booked.
🚫 Request #3: CONFLICT — One or more requested time slots are already booked.
🚫 Request #5: CONFLICT — One or more requested time slots are already booked.
... (9 total conflicts)

─────────────────────────────────────────────────────
SUMMARY
─────────────────────────────────────────────────────
Total requests:     10
Successes (201):    1       ← exactly one winner
Conflicts (409):    9       ← all others blocked
Total time:         124ms

🎉 TEST PASSED: Exactly 1 booking succeeded, all others got 409
   The database-level unique index correctly prevented double-booking
```

---

## 🚢 Deployment

### Backend → Render

1. Push your backend code to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your repo and set:

| Field         | Value                          |
| ------------- | ------------------------------ |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start`                    |
| Instance Type | Free                           |

4. Add environment variables in Render dashboard:

```
MONGODB_URI    mongodb+srv://user:pass@cluster.mongodb.net/meeting-room-booking
PORT           10000
NODE_ENV       production
CORS_ORIGIN    https://your-frontend.vercel.app
```

5. Update `server.ts` to bind on `0.0.0.0` for Render:

```typescript
app.listen(PORT, '0.0.0.0', () => { ... });
```

6. After first deploy, run the seed via Render Shell tab:

```bash
npm run seed
```

### Frontend → Vercel

1. Push your frontend code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import repo
3. Framework preset will auto-detect **Next.js**
4. Add environment variable:

```
NEXT_PUBLIC_API_URL    https://your-backend.onrender.com
```

5. Deploy — Vercel handles everything else automatically

---

## 🏗 Core Design Decisions

### Why SlotLock instead of checking Booking directly?

A query like `Booking.find({ room, date, slots: { $in: requestedSlots } })` followed by a create has a **TOCTOU race condition** (Time Of Check vs Time Of Use). Between the check and the write, another request can slip through.

`SlotLock` with a unique index eliminates this gap entirely. The check and the write become one atomic operation — either the insert succeeds or it throws `11000`. No application-level locking or transactions required for the basic case.

### Why store `date` as a string ("YYYY-MM-DD") instead of a Date?

MongoDB `Date` objects include timezone information which can cause subtle bugs when comparing dates across timezones. Storing as a fixed string and always interpreting times as UTC makes the availability logic completely deterministic regardless of where the server runs.

### Why is the refund decision on the server, not the client?

A client could trivially send a fake timestamp to claim a refund they don't deserve. The server only accepts the booking ID and computes `bookingStart - Date.now()` itself. The client has zero influence over the outcome.

### Why does the availability grid read from SlotLock, not Booking?

If the grid read from `Booking` (e.g. finding bookings where `startTime < slot < endTime`) and the booking system wrote to `SlotLock`, they could theoretically get out of sync. By making both read and write touch the same `SlotLock` collection, a slot is available if and only if it has no `SlotLock` document — exactly the same condition that governs whether a new booking insert will succeed.
