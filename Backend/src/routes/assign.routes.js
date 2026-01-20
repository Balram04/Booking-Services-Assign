const express = require("express");
const Booking = require("../models/Booking");
const Provider = require("../models/Provider");
const { logBookingEvent } = require("../services/bookingEvents");
const { setProviderAvailability } = require("../services/assignment");


const router = express.Router();

async function pickProviderId({ providerIds }) {
  // Picks the provider with the least number of active jobs.
  // Active = ASSIGNED or IN_PROGRESS.
  const uniqueProviderIds = Array.from(
    new Set((providerIds || []).filter(Boolean).map((id) => String(id)))
  );

  if (uniqueProviderIds.length === 0) return null;

  const counts = await Promise.all(
    uniqueProviderIds.map(async (providerId) => {
      const activeCount = await Booking.countDocuments({
        providerId,
        status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
      });
      return { providerId, activeCount };
    })
  );

  counts.sort((a, b) => a.activeCount - b.activeCount);
  const bestCount = counts[0].activeCount;
  const bestProviders = counts.filter((c) => c.activeCount === bestCount);
  const chosen = bestProviders[Math.floor(Math.random() * bestProviders.length)];

  return chosen.providerId;
}

router.post("/bookings/:id/assign", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { providerId, providerIds, auto } = req.body;

    // Manual assignment: provide `providerId`
    // Auto assignment: provide `providerIds` (candidate list), optionally `auto: true`
    const chosenProviderId =
      providerId || (auto === true || Array.isArray(providerIds) ? await pickProviderId({ providerIds }) : null);

    if (!chosenProviderId) {
      return res.status(400).json({
        success: false,
        message:
          "Provide `providerId` for manual assignment, or `providerIds` (array) for automatic assignment",
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
    if (booking.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only PENDING bookings can be assigned",
      });
    }

    const provider = await Provider.findById(chosenProviderId);
    if (!provider) {
      return res.status(400).json({
        success: false,
        message: "Provider not found",
      });
    }

    // 3️⃣ Update booking
    booking.providerId = chosenProviderId;
    booking.status = "ASSIGNED";
    await booking.save();

    await setProviderAvailability(chosenProviderId, false);

    // 4️⃣ Log event
    await logBookingEvent({
      bookingId: booking._id,
      oldStatus: "PENDING",
      newStatus: "ASSIGNED",
      changedBy: "SYSTEM",
      note: providerId ? "Provider assigned" : "Provider auto-assigned",
    });

    // 5️⃣ Response
    res.status(200).json({
      success: true,
      message: "Provider assigned successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to assign provider",
      error: error.message,
    });
  }
});

module.exports = router;
