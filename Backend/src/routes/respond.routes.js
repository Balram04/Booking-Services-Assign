const express = require("express");
const Booking = require("../models/Booking");
const { logBookingEvent } = require("../services/bookingEvents");
const { findAvailableProvider, setProviderAvailability, autoAssignToNextInQueue } = require("../services/assignment");

const router = express.Router();

router.post("/bookings/:id/respond", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { accept, providerId } = req.body;

    if (typeof accept !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "accept must be a boolean",
      });
    }

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "providerId is required",
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

    // 2️⃣ Validate state
    // - Only ASSIGNED bookings can be accepted/rejected by the provider.
    if (!["ASSIGNED"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Provider can respond only to ASSIGNED bookings",
      });
    }

    // Provider must match assigned provider
    if (booking.providerId && String(booking.providerId) !== String(providerId)) {
      return res.status(403).json({
        success: false,
        message: "This booking is assigned to a different provider",
      });
    }

    // 3️⃣ ACCEPT flow
    if (accept === true) {
      // Check if provider already has an ongoing booking
      const existingActiveBooking = await Booking.findOne({
        providerId: providerId,
        status: "IN_PROGRESS"
      });

      if (existingActiveBooking) {
        return res.status(400).json({
          success: false,
          message: "Provider already has an active booking in progress. Please complete or cancel the current booking before accepting a new one.",
          activeBookingId: existingActiveBooking._id
        });
      }

      const oldStatus = booking.status;
      booking.status = "IN_PROGRESS";
      await booking.save();

      await logBookingEvent({
        bookingId: booking._id,
        oldStatus,
        newStatus: booking.status,
        changedBy: "PROVIDER",
        note: "Provider accepted booking",
      });

      return res.status(200).json({
        success: true,
        message: "Booking accepted by provider",
        data: booking,
      });
    }

    // 4️⃣ REJECT flow
    const rejectedProviderId = booking.providerId;
    const serviceType = booking.serviceType;
    
    booking.providerId = null;
    booking.status = "PENDING";
    booking.rejectionCount += 1;
    await booking.save();

    await logBookingEvent({
      bookingId: booking._id,
      oldStatus: "ASSIGNED",
      newStatus: "PENDING",
      changedBy: "PROVIDER",
      note: "Provider rejected booking",
    });

    // Retry assignment (exclude the rejecting provider)
    const nextProvider = await findAvailableProvider({
      serviceType: booking.serviceType,
      excludeProviderIds: [rejectedProviderId],
    });

    if (nextProvider) {
      const oldStatus = booking.status;
      booking.providerId = nextProvider._id;
      booking.status = "ASSIGNED";
      await booking.save();

      await setProviderAvailability(nextProvider._id, false);

      await logBookingEvent({
        bookingId: booking._id,
        oldStatus,
        newStatus: booking.status,
        changedBy: "SYSTEM",
        note: `Re-assigned after rejection to ${nextProvider.name}`,
      });
    }

    // Auto-assign the rejecting provider to the next pending booking in queue
    const providerNextAssignment = await autoAssignToNextInQueue(rejectedProviderId, serviceType);

    if (providerNextAssignment) {
      // Rejecting provider was auto-assigned to next booking in queue
      res.status(200).json({
        success: true,
        message: "Booking rejected and re-assigned to another provider. You have been assigned to the next booking in queue.",
        data: {
          rejectedBooking: booking,
          providerNextAssignment: {
            bookingId: providerNextAssignment._id,
            customerId: providerNextAssignment.customerId,
            serviceType: providerNextAssignment.serviceType,
            status: providerNextAssignment.status,
          },
        },
      });
    } else {
      // No pending bookings for the rejecting provider, mark as available
      await setProviderAvailability(rejectedProviderId, true);
      
      res.status(200).json({
        success: true,
        message: "Booking rejected and re-assigned to another provider. No pending bookings in queue for you.",
        data: {
          rejectedBooking: booking,
          providerStatus: "available",
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to process provider response",
      error: error.message,
    });
  }
});

module.exports = router;
