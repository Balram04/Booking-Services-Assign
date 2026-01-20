# Booking Services Backend (Node.js + Express + MongoDB)

This backend manages the complete **booking lifecycle** (create → assign → provider respond → start → complete) and maintains a **history/audit trail** using `BookingEvent` for every status change.

## 1) Quick Start (Step-by-step)

### Step 1 — Install dependencies
```bash
npm install
```

### Step 2 — Create `.env`
Create a `.env` file in the backend root (same folder as `server.js`):

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/booking_services
```

### Step 3 — Start MongoDB
Make sure MongoDB is running (local service or MongoDB Atlas).

### Step 4 — Run the server
```bash
npm run dev
```

Health check:
```bash
curl http://localhost:5000/health
```

---

## 2) Backend Architecture (Whole picture)

### Components

1. **Express App**: request routing + middleware
	- Entry: `server.js` (connects DB, starts server)
	- App: `app.js` (mounts routes, JSON parsing, CORS)

2. **MongoDB (Mongoose models)**
	- `Booking`: current state of a booking
	- `BookingEvent`: immutable event log (history/audit)

3. **Routes (feature-based modules)**
	- `booking.routes.js` → create booking
	- `assign.routes.js` → assign provider
	- `respond.routes.js` → provider accepts/rejects
	- `Complete-Start.routes.js` → start / complete job
	- `cancle-fail.routes.js` → cancel / fail booking
	- `Admin.routes.js` → admin override
	- `history.routes.js` → history timeline

### Data model

**Booking** (current state)
- `customerId` (required)
- `providerId` (nullable)
- `serviceType`
- `status` ∈ `PENDING | ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED | FAILED`
- `rejectionCount`

**BookingEvent** (history)
- `bookingId` (required)
- `oldStatus` (required)
- `newStatus` (required)
- `actionBy` ∈ `customer | provider | admin | system` (required)
- `note` (optional)
- `timestamp`

---

## 3) Booking Lifecycle (State machine)

The status transition rules implemented by routes:

1. `PENDING` → `ASSIGNED` (provider assigned)
2. `ASSIGNED` → `IN_PROGRESS` (provider accepted OR job started)
3. `IN_PROGRESS` → `COMPLETED` (job completed)
4. `PENDING|ASSIGNED` → `CANCELLED` (cancel before work starts)
5. `ANY` → `FAILED` (system/admin failure)

Every time a status changes, we create a **BookingEvent** so history can be fetched later.

---

## 4) Step-by-step Backend Flow (What happens in order)

Below is the full backend journey, with what each step does internally.

### Step 1 — Create Booking
**Endpoint:** `POST /bookings`

**Input:** `{ customerId, serviceType }`

**What happens:**
1. Create a `Booking` document with `status = PENDING`
2. Create a `BookingEvent`:
	- `oldStatus: PENDING`, `newStatus: PENDING`, `actionBy: system`

---

### Step 2 — Assign Provider
**Endpoint:** `POST /bookings/:id/assign`

**Input:** `{ providerId }`

**What happens:**
1. Validate booking exists
2. Validate booking is `PENDING`
3. Update booking:
	- set `providerId`
	- set status `ASSIGNED`
4. Create a `BookingEvent`:
	- `oldStatus: PENDING`, `newStatus: ASSIGNED`, `actionBy: system`

---

### Step 3 — Provider Responds (Accept / Reject)
**Endpoint:** `POST /bookings/:id/respond`

**Input:** `{ accept: true|false }`

**Accept flow (`accept: true`):**
1. Validate booking is `ASSIGNED`
2. Update booking → `IN_PROGRESS`
3. Create `BookingEvent`:
	- `oldStatus: ASSIGNED`, `newStatus: IN_PROGRESS`, `actionBy: provider`

**Reject flow (`accept: false`):**
1. Validate booking is `ASSIGNED`
2. Reset booking → `PENDING`, clear `providerId`, increment `rejectionCount`
3. Create `BookingEvent`:
	- `oldStatus: ASSIGNED`, `newStatus: PENDING`, `actionBy: provider`

---

### Step 4 — Start Job
**Endpoint:** `POST /bookings/:id/start`

**What happens:**
1. Validate booking is `ASSIGNED`
2. Update booking → `IN_PROGRESS`
3. Create `BookingEvent`:
	- `oldStatus: ASSIGNED`, `newStatus: IN_PROGRESS`, `actionBy: provider`

---

### Step 5 — Complete Job
**Endpoint:** `POST /bookings/:id/complete`

**What happens:**
1. Validate booking is `IN_PROGRESS`
2. Update booking → `COMPLETED`
3. Create `BookingEvent`:
	- `oldStatus: IN_PROGRESS`, `newStatus: COMPLETED`, `actionBy: provider`

---

### Step 6 — Cancel Booking (Before work starts)
**Endpoint:** `POST /bookings/:id/cancel`

**Input:** `{ reason? }`

**What happens:**
1. Allowed only if booking is `PENDING` or `ASSIGNED`
2. Update booking → `CANCELLED` and clear provider
3. Create `BookingEvent`:
	- `oldStatus: <PENDING|ASSIGNED>`, `newStatus: CANCELLED`, `actionBy: customer`

---

### Step 7 — Mark Booking as FAILED (Admin/System)
**Endpoint:** `POST /bookings/:id/fail`

**Input:** `{ reason? }`

**What happens:**
1. Update booking → `FAILED`
2. Create `BookingEvent`:
	- `oldStatus: <previous>`, `newStatus: FAILED`, `actionBy: system`

---

### Step 8 — Admin Override
**Endpoint:** `POST /admin/bookings/:id/override`

**Input:** `{ status?, providerId? }`

**What happens:**
1. Update booking even if it breaks normal flow (admin power)
2. Create `BookingEvent`:
	- `oldStatus: <previous>`, `newStatus: <updated>`, `actionBy: admin`

---

### Step 9 — Fetch Booking History (Timeline)
**Endpoint:** `GET /bookings/:id/history`

**What happens:**
1. Query `BookingEvent` by `bookingId`
2. Sort by `timestamp` (oldest → newest)
3. Return event list

---

## 5) API Examples

Create booking:
```bash
curl -X POST http://localhost:5000/bookings \
  -H "Content-Type: application/json" \
  -d '{"customerId":"<mongo_object_id>","serviceType":"Deep cleaning"}'
```

Assign provider:
```bash
curl -X POST http://localhost:5000/bookings/<bookingId>/assign \
  -H "Content-Type: application/json" \
  -d '{"providerId":"<mongo_object_id>"}'
```

Provider respond:
```bash
curl -X POST http://localhost:5000/bookings/<bookingId>/respond \
  -H "Content-Type: application/json" \
  -d '{"accept":true}'
```

History:
```bash
curl http://localhost:5000/bookings/<bookingId>/history
```

---

## 6) Troubleshooting

### Cannot POST `/bookings/:id/assign%20`
That `%20` means the client is sending a trailing space in the URL. Fix the client URL string so the request is exactly:
`POST /bookings/:id/assign`

### BookingEvent validation error (missing `oldStatus` / `actionBy`)
The `BookingEvent` schema requires:
- `oldStatus`
- `newStatus`
- `actionBy`

If you add new routes, always include these fields when calling `BookingEvent.create()`.

---

## 7) Folder Structure
```
Backend/
  app.js
  server.js
  src/
	 models/
		Booking.js
		BookingEvent.js
	 routes/
		booking.routes.js
		assign.routes.js
		respond.routes.js
		Complete-Start.routes.js
		cancle-fail.routes.js
		Admin.routes.js
		history.routes.js
```
