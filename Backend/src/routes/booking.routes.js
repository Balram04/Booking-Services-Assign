const express = require("express");
const Booking = require("../models/Booking");
const { logBookingEvent } = require("../services/bookingEvents");
const { findAvailableProvider, setProviderAvailability } = require("../services/assignment");

const router = express.Router();

// LIST BOOKINGS
// GET /bookings?status=PENDING&customerId=...&providerId=...
router.get("/bookings", async (req, res) => {
  try {
    const { status, customerId, providerId } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (providerId) filter.providerId = providerId;

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
});

// GET ONE BOOKING
// GET /bookings/:id
router.get("/bookings/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking fetched successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch booking",
      error: error.message,
    });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const { serviceType, customerId } = req.body;

    // 1️⃣ Create booking
    const bookingPayload = {
      serviceType,
      status: "PENDING",
      ...(customerId ? { customerId } : {}),
    };

    let booking;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        booking = await Booking.create(bookingPayload);
        break;
      } catch (err) {
        // Duplicate customerId
        if (err?.code === 11000 && (err?.keyPattern?.customerId || err?.keyValue?.customerId)) {
          // Otherwise, the generated id collided (extremely unlikely). Retry.
          if (attempt === maxAttempts) throw err;
          continue;
        }

        throw err;
      }
    }

    // 2️⃣ Log booking event
    await logBookingEvent({
      bookingId: booking._id,
      oldStatus: "PENDING",
      newStatus: "PENDING",
      changedBy: "SYSTEM",
      note: "Booking created",
    });

    // 3️⃣ Auto-assign (simple logic)
    const provider = await findAvailableProvider({ serviceType: booking.serviceType });
    if (provider) {
      const oldStatus = booking.status;
      booking.providerId = provider._id;
      booking.status = "ASSIGNED";
      await booking.save();

      await setProviderAvailability(provider._id, false);

      await logBookingEvent({
        bookingId: booking._id,
        oldStatus,
        newStatus: booking.status,
        changedBy: "SYSTEM",
        note: `Auto-assigned to ${provider.name}`,
      });
    }

    // 3️⃣ Send response
    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create booking",
      error: error.message,
    });
  }
});

module.exports = router;
