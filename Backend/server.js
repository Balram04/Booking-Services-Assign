require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const { ensureSeedProviders } = require('./src/services/assignment');

// connect DB & start server
async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected");

    await ensureSeedProviders();
    console.log('✅ Providers seeded');

    app.listen(PORT, () => {
     console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
}

startServer();
