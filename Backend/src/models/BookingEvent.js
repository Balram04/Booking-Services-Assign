const mongoose = require('mongoose');
//history of BookingEvent model
//BookingEvent ek log table hai jo booking ke har status change ka record rakhta hai.”
const bookingEventSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },

    oldStatus: {
      type: String,
      enum: [
        'PENDING',
        'ASSIGNED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'FAILED',
      ],
      required: true,
    },

    newStatus: {
      type: String,
      enum: [
        'PENDING',
        'ASSIGNED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'FAILED',
      ],
      required: true,
    },

    changedBy: {
      type: String,
      enum: ['CUSTOMER', 'PROVIDER', 'ADMIN', 'SYSTEM'],
      required: true,
    },

    note: {
      type: String,
      trim: true,
      default: null,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model('BookingEvent', bookingEventSchema);
