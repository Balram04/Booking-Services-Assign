const express = require("express");
const Booking = require("../models/Booking");
const Provider = require("../models/Provider");
const { logBookingEvent } = require("../services/bookingEvents");
const { setProviderAvailability, autoAssignToNextInQueue } = require("../services/assignment");

const router = express.Router();

/**
 * COMPLETE JOB
 * POST /bookings/:id/complete
 */
router.post("/bookings/:id/complete", async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId).populate('providerId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // State validation
    if (booking.status !== "IN_PROGRESS") {
      return res.status(400).json({
        success: false,
        message: "Job can be completed only if booking is IN_PROGRESS",
      });
    }

    const providerId = booking.providerId?._id || booking.providerId;
    const serviceType = booking.serviceType;

    // Transition
    booking.status = "COMPLETED";
    await booking.save();

    // Event log for completion
    await logBookingEvent({
      bookingId: booking._id,
      oldStatus: "IN_PROGRESS",
      newStatus: booking.status,
      changedBy: "PROVIDER",
      note: "Job completed",
    });

    // Automatically assign provider to next pending booking in queue (FIFO)
    const nextAssignment = await autoAssignToNextInQueue(providerId, serviceType);

    if (nextAssignment) {
      // Provider was auto-assigned to next booking
      res.status(200).json({
        success: true,
        message: "Job completed successfully and provider auto-assigned to next booking",
        data: {
          completedBooking: booking,
          nextAssignment: {
            bookingId: nextAssignment._id,
            customerId: nextAssignment.customerId,
            serviceType: nextAssignment.serviceType,
            status: nextAssignment.status,
          },
        },
      });
    } else {
      // No pending bookings, provider marked as available
      await setProviderAvailability(providerId, true);
      
      res.status(200).json({
        success: true,
        message: "Job completed successfully. No pending bookings in queue.",
        data: {
          completedBooking: booking,
          providerStatus: "available",
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to complete job",
      error: error.message,
    });
  }
});

module.exports = router;
