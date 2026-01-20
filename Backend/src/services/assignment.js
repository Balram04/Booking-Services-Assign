const Provider = require('../models/Provider');
const Booking = require('../models/Booking');
const { logBookingEvent } = require('./bookingEvents');

async function ensureSeedProviders() {
  const seeds = [
    { name: 'Provider A', serviceType: 'CLEANING' },
    { name: 'Provider B', serviceType: 'PLUMBING' },
    { name: 'Provider C', serviceType: 'ELECTRICIAN' },
  ];

  await Promise.all(
    seeds.map(async (seed) => {
      await Provider.updateOne(
        { name: seed.name },
        {
          $setOnInsert: {
            name: seed.name,
            serviceType: seed.serviceType,
            isAvailable: true,
          },
        },
        { upsert: true }
      );
    })
  );
}

async function setProviderAvailability(providerId, isAvailable) {
  if (!providerId) return;
  await Provider.updateOne(
    { _id: providerId },
    {
      $set: { isAvailable: Boolean(isAvailable) },
    }
  );
}

async function findAvailableProvider({ serviceType, excludeProviderIds = [] }) {
  const exclude = (excludeProviderIds || []).filter(Boolean);
  const query = {
    serviceType,
    isAvailable: true,
    ...(exclude.length ? { _id: { $nin: exclude } } : {}),
  };

  return Provider.findOne(query).sort({ createdAt: 1 });
}

/**
 * Auto-assign provider to next pending booking in queue (FIFO order)
 * @param {String} providerId - Provider ID to assign
 * @param {String} serviceType - Service type the provider handles
 * @returns {Object|null} - Assigned booking or null if no pending bookings
 */
async function autoAssignToNextInQueue(providerId, serviceType) {
  try {
    // Find the oldest pending booking for this service type (FIFO - First In First Out)
    const nextBooking = await Booking.findOne({
      serviceType: serviceType,
      status: 'PENDING'
    }).sort({ createdAt: 1 }); // Sort by creation time, oldest first

    if (!nextBooking) {
      // No pending bookings, just mark provider as available
      return null;
    }

    // Assign the provider to this booking
    nextBooking.providerId = providerId;
    nextBooking.status = 'ASSIGNED';
    await nextBooking.save();

    // Mark provider as unavailable (busy with new assignment)
    await setProviderAvailability(providerId, false);

    // Log the auto-assignment event
    await logBookingEvent({
      bookingId: nextBooking._id,
      oldStatus: 'PENDING',
      newStatus: 'ASSIGNED',
      changedBy: 'SYSTEM',
      note: 'Auto-assigned to provider after previous job completion',
    });

    return nextBooking;
  } catch (error) {
    console.error('Error in autoAssignToNextInQueue:', error);
    throw error;
  }
}

module.exports = {
  ensureSeedProviders,
  setProviderAvailability,
  findAvailableProvider,
  autoAssignToNextInQueue,
};
