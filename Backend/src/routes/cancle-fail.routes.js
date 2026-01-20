const express = require("express");
const Booking = require("../models/Booking");
const { logBookingEvent } = require("../services/bookingEvents");
const { setProviderAvailability, autoAssignToNextInQueue } = require("../services/assignment");

const router = express.Router();

/**
 * CANCEL BOOKING
 * POST /bookings/:id/cancel
 */
router.post("/bookings/:id/cancel", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Allowed only in PENDING or ASSIGNED
    if (!["PENDING", "ASSIGNED"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Booking cannot be cancelled at this stage",
      });
    }

    const oldStatus = booking.status;
    const freedProviderId = booking.providerId;
    const serviceType = booking.serviceType;

    booking.status = "CANCELLED";
    booking.cancellationReason = reason || "Cancelled by user";
    booking.providerId = null;

    await booking.save();

    await logBookingEvent({
      bookingId: booking._id,
      oldStatus,
      newStatus: "CANCELLED",
      changedBy: "CUSTOMER",
      note: booking.cancellationReason,
    });

    // If provider was assigned, auto-assign them to next booking in queue
    let providerNextAssignment = null;
    if (freedProviderId) {
      providerNextAssignment = await autoAssignToNextInQueue(freedProviderId, serviceType);
      
      if (!providerNextAssignment) {
        // No pending bookings, mark provider as available
        await setProviderAvailability(freedProviderId, true);
      }
    }

    res.status(200).json({
      success: true,
      message: providerNextAssignment 
        ? "Booking cancelled successfully. Provider auto-assigned to next booking."
        : "Booking cancelled successfully.",
      data: {
        cancelledBooking: booking,
        ...(providerNextAssignment && {
          providerNextAssignment: {
            bookingId: providerNextAssignment._id,
            customerId: providerNextAssignment.customerId,
            serviceType: providerNextAssignment.serviceType,
            status: providerNextAssignment.status,
          },
        }),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
});

/**
 * MARK BOOKING AS FAILED (ADMIN / SYSTEM)
 * POST /bookings/:id/fail
 */
router.post("/bookings/:id/fail", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const oldStatus = booking.status;
    const freedProviderId = booking.providerId;
    const serviceType = booking.serviceType;

    booking.status = "FAILED";
    booking.failureReason = reason || "Marked as failed by system";

    await booking.save();

    await logBookingEvent({
      bookingId: booking._id,
      oldStatus,
      newStatus: "FAILED",
      changedBy: "SYSTEM",
      note: booking.failureReason,
    });

    // If provider was assigned, auto-assign them to next booking in queue
    let providerNextAssignment = null;
    if (freedProviderId) {
      providerNextAssignment = await autoAssignToNextInQueue(freedProviderId, serviceType);
      
      if (!providerNextAssignment) {
        // No pending bookings, mark provider as available
        await setProviderAvailability(freedProviderId, true);
      }
    }

    res.status(200).json({
      success: true,
      message: providerNextAssignment
        ? "Booking marked as FAILED. Provider auto-assigned to next booking."
        : "Booking marked as FAILED.",
      data: {
        failedBooking: booking,
        ...(providerNextAssignment && {
          providerNextAssignment: {
            bookingId: providerNextAssignment._id,
            customerId: providerNextAssignment.customerId,
            serviceType: providerNextAssignment.serviceType,
            status: providerNextAssignment.status,
          },
        }),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark booking as FAILED",
      error: error.message,
    });
  }
});

module.exports = router;
