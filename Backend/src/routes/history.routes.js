const express = require("express");
const BookingEvent = require("../models/BookingEvent");

const router = express.Router();

/**
 * GET BOOKING HISTORY
 * GET /bookings/:id/history
 */
router.get("/bookings/:id/history", async (req, res) => {
  try {
    const bookingId = req.params.id;

    const events = await BookingEvent.find({ bookingId })
      .sort({ timestamp: 1 }); // oldest → newest

    res.status(200).json({
      success: true,
      message: "Booking history fetched successfully",
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch booking history",
      error: error.message,
    });
  }
});

module.exports = router;
