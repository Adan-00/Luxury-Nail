// ================================
// LUXURY NAIL BACKEND — server.js
// Ready to paste ✅
// ================================

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

// --------------------
// App setup
// --------------------
const app = express();
app.use(express.json({ limit: "1mb" }));

// ✅ CORS (works for local + deployed)
app.use(
  cors({
    origin: "*", // tighten later to your frontend domain
    methods: ["GET", "POST", "OPTIONS"],
  })
);

// --------------------
// Storage (bookings.json)
// --------------------
const BOOKINGS_FILE = path.join(process.cwd(), "bookings.json");

function ensureBookingsFile() {
  try {
    if (!fs.existsSync(BOOKINGS_FILE)) {
      fs.writeFileSync(BOOKINGS_FILE, "[]", "utf8");
    }
  } catch (e) {
    console.error("❌ Could not create bookings.json:", e);
  }
}

function readBookings() {
  ensureBookingsFile();
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, "utf8");
    const data = JSON.parse(raw || "[]");
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("❌ readBookings error:", e);
    return [];
  }
}

function writeBookings(bookings) {
  ensureBookingsFile();
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), "utf8");
}

// --------------------
// Slot settings (24h format HH:mm)
// --------------------
const ALL_SLOTS = [
  "10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00"
];

// --------------------
// Health check
// --------------------
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Luxury Nail Backend running ✅" });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// --------------------
// ✅ GET available slots for a date
// /api/slots?date=YYYY-MM-DD
// Returns: { slots: [...] }
// --------------------
app.get("/api/slots", (req, res) => {
  const { date } = req.query;

  if (!date) return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });

  const bookings = readBookings();
  const bookedTimes = bookings
    .filter(b => b.date === date)
    .map(b => b.time);

  const slots = ALL_SLOTS.filter(t => !bookedTimes.includes(t));

  res.json({ slots });
});

// --------------------
// ✅ GET all appointments (optional admin/debug)
// --------------------
app.get("/api/appointments", (req, res) => {
  const bookings = readBookings();
  res.json({ bookings });
});

// --------------------
// ✅ POST new appointment
// Body expects:
// { fullName, clientEmail, contactDetail, service, date, time, notes }
// --------------------
app.post("/api/appointments", (req, res) => {
  const {
    fullName = "",
    clientEmail = "",
    contactDetail = "",
    service = "",
    date = "",
    time = "",
    notes = ""
  } = req.body || {};

  if (!date || !time) {
    return res.status(400).json({ error: "date and time are required" });
  }

  // enforce HH:mm format (basic check)
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: "time must be in HH:mm (e.g. 15:00)" });
  }

  // must be a valid slot time
  if (!ALL_SLOTS.includes(time)) {
    return res.status(400).json({ error: "time is not a valid slot" });
  }

  const bookings = readBookings();

  // prevent double-booking
  const alreadyBooked = bookings.some(b => b.date === date && b.time === time);
  if (alreadyBooked) {
    return res.status(409).json({ error: "That slot is already booked" });
  }

  const newBooking = {
    id: Date.now(),
    fullName,
    clientEmail,
    contactDetail,
    service,
    date,
    time,
    notes,
    createdAt: new Date().toISOString()
  };

  bookings.push(newBooking);

  try {
    writeBookings(bookings);
  } catch (e) {
    console.error("❌ writeBookings error:", e);
    return res.status(500).json({ error: "Failed to save booking" });
  }

  res.status(201).json({ ok: true, booking: newBooking });
});

// --------------------
// Server start (Render compatible)
// --------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📄 bookings file: ${BOOKINGS_FILE}`);
});

