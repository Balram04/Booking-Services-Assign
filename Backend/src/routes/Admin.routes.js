const express = require("express");
const Booking = require("../models/Booking");
const Provider = require("../models/Provider");
const { logBookingEvent } = require("../services/bookingEvents");
const { setProviderAvailability } = require("../services/assignment");

const router = express.Router();

/**
 * ADMIN OVERRIDE BOOKING
 * POST /admin/bookings/:id/override
 */
router.post("/admin/bookings/:id/override", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status, providerId } = req.body;

    const allowedStatuses = [
      "PENDING",
      "ASSIGNED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "FAILED",
    ];

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
      });
    }

    // 1️⃣ Fetch booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // 2️⃣ Store old state
    const oldStatus = booking.status;
    const oldProviderId = booking.providerId;

    // 3️⃣ Force update (NO restrictions)
    if (status) {
      booking.status = status;
    }

    if (providerId !== undefined) {
      booking.providerId = providerId;
    }

    await booking.save();

    // Provider availability adjustments (best-effort)
    if (providerId !== undefined && String(oldProviderId || "") !== String(providerId || "")) {
      await setProviderAvailability(oldProviderId, true);

      if (providerId) {
        const provider = await Provider.findById(providerId);
        if (provider) {
          await setProviderAvailability(providerId, false);
        }
      }
    }

    if (["COMPLETED", "CANCELLED", "FAILED"].includes(booking.status)) {
      await setProviderAvailability(booking.providerId, true);
    }

    // 4️⃣ Log admin override event
    await logBookingEvent({
      bookingId: booking._id,
      oldStatus,
      newStatus: booking.status,
      changedBy: "ADMIN",
      note: "Admin override",
    });

    // 5️⃣ Response
    res.status(200).json({
      success: true,
      message: "Booking overridden by admin",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Admin override failed",
      error: error.message,
    });
  }
});

module.exports = router;
