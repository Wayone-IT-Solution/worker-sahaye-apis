import mongoose from "mongoose";
import { config } from "../config/config";
import { seedFaqData } from "./faq.seed";

const MONGO_URI = `${config.db.url}/${config.db.name}`;

(async () => {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    await seedFaqData();

    await mongoose.disconnect();
    console.log("✅ Seeding completed");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
})();
