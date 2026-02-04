// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ IMPORTANT FIX:
// server.js is ALREADY inside /nails
// so DO NOT add "nails" again
app.use(express.static(__dirname));

// ✅ Serve homepage correctly
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ==============================
// BOOKINGS STORAGE
// ==============================
const BOOKINGS_FILE = path.join(__dirname, "bookings.json");

function readBookings() {
  try {
    if (!fs.existsSync(BOOKINGS_FILE)) return [];
    const raw = fs.readFileSync(BOOKINGS_FILE, "utf8");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBooking(b) {
  const all = readBookings();
  all.push(b);
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(all, null, 2), "utf8");
}

// ==============================
// SLOT RULES
// ==============================
const SERVICE_DURATION = {
  manicure: 45,
  gel: 60,
  acrylics: 75,
  "nail-art": 30,
};

const DEFAULT_SLOTS = [
  "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00",
];

// ==============================
// AVAILABLE SLOTS API
// ==============================
app.get("/api/slots", (req, res) => {
  const { date, service } = req.query;

  if (!date || !service) {
    return res.status(400).json({ error: "Missing date or service." });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reqDate = new Date(date + "T00:00:00");

  if (isNaN(reqDate.getTime())) {
    return res.status(400).json({ error: "Invalid date format." });
  }

  if (reqDate < today) {
    return res.status(400).json({ error: "Cannot book past dates." });
  }

  const bookings = readBookings();
  const bookedTimes = bookings
    .filter((b) => b.date === date)
    .map((b) => b.time);

  const available = DEFAULT_SLOTS.filter((t) => !bookedTimes.includes(t));

  res.json({
    date,
    service,
    durationMins: SERVICE_DURATION[service] || 60,
    available,
  });
});

// ==============================
// EMAIL SETUP
// ==============================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ==============================
// BOOKING ENDPOINT
// ==============================
app.post("/api/appointments", async (req, res) => {
  try {
    const {
      fullName,
      clientEmail,
      contactDetail,
      service,
      date,
      time,
      notes,
    } = req.body;

    if (!fullName || !clientEmail || !contactDetail || !service || !date || !time) {
      return res.status(400).send("Missing required booking fields.");
    }

    const bookings = readBookings();
    const exists = bookings.some((b) => b.date === date && b.time === time);
    if (exists) {
      return res.status(409).send("That time is already booked.");
    }

    const booking = {
      id: Date.now(),
      fullName,
      clientEmail,
      contactDetail,
      service,
      date,
      time,
      notes: notes || "",
      createdAt: new Date().toISOString(),
    };

    saveBooking(booking);

    const mailTo = process.env.BOOKING_TO || process.env.EMAIL_USER;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !mailTo) {
      return res.status(200).send("Booking saved ✅ (email not configured)");
    }

    await transporter.sendMail({
      from: `"Luxury Nail Studio" <${process.env.EMAIL_USER}>`,
      to: mailTo,
      replyTo: clientEmail,
      subject: `New booking: ${service} — ${date} at ${time}`,
      text: `
New Booking 💅

Name: ${fullName}
Email: ${clientEmail}
Contact: ${contactDetail}

Service: ${service}
Date: ${date}
Time: ${time}

Notes:
${notes || "(none)"}

Booking ID: ${booking.id}
      `.trim(),
    });

    res.status(200).send("Booking saved + email sent ✅");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error.");
  }
});

// ==============================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
