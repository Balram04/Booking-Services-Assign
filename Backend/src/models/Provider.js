const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    serviceType: {
      type: String,
      required: true,
      enum: ['CLEANING', 'PLUMBING', 'ELECTRICIAN'],
      index: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

providerSchema.index({ serviceType: 1, isAvailable: 1 });

module.exports = mongoose.model('Provider', providerSchema);
