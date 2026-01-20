const express = require('express');
const Provider = require('../models/Provider');
const Booking = require('../models/Booking');

const router = express.Router();

// GET /providers
router.get('/providers', async (req, res) => {
  try {
    const providers = await Provider.find({}).sort({ createdAt: 1 });
    res.status(200).json({
      success: true,
      message: 'Providers fetched successfully',
      data: providers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch providers',
      error: error.message,
    });
  }
});

// GET /providers/:id/bookings?status=ASSIGNED
router.get('/providers/:id/bookings', async (req, res) => {
  try {
    const providerId = req.params.id;
    const { status } = req.query;

    const filter = { providerId };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).limit(200);
    res.status(200).json({
      success: true,
      message: 'Provider bookings fetched successfully',
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch provider bookings',
      error: error.message,
    });
  }
});

module.exports = router;
