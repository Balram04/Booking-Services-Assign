const BookingEvent = require('../models/BookingEvent');

async function logBookingEvent({ bookingId, oldStatus, newStatus, changedBy, note = null }) {
  return BookingEvent.create({
    bookingId,
    oldStatus,
    newStatus,
    changedBy,
    note,
    timestamp: new Date(),
  });
}

module.exports = {
  logBookingEvent,
};
