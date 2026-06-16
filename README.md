# 🏢 Meeting Room Booking System

A full-stack meeting room booking application built with **Next.js**, **Node.js/Express**, and **MongoDB**. The system enforces concurrency-safe bookings at the database level, meaning two people can never double-book the same room even if they click "Book" at the exact same instant.

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

```bash for SSH
git clone git@github.com:kksharma2101/Rahane-meeting-booking-assignment.git

for HTTPS
git clone https://github.com/kksharma2101/Rahane-meeting-booking-assignment.git

cd Rahane-meeting-booking-assignment
```

### Step 2 — Set up the Backend

```bash
cd backend

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
cd frontend

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

### Frontend — `.env.local`

| Variable              | Required | Description      |
| --------------------- | -------- | ---------------- |
| `NEXT_PUBLIC_API_URL` | ✅ Yes   | Backend base URL |

```bash
# Local development
NEXT_PUBLIC_API_URL=http://localhost:5000