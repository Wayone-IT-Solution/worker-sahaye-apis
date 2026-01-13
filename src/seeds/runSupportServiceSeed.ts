import mongoose from "mongoose";
import dotenv from "dotenv";
import { seedSupportServices } from "./supportservice.seed";

dotenv.config();

(async () => {
    try {
        console.log("⏳ Connecting to MongoDB...");
        
        await mongoose.connect(
            "mongodb+srv://algotrading:trading@trading.z65o8.mongodb.net/workerSahaye"
        );

        console.log("✅ MongoDB connected");

        await seedSupportServices("507f1f77bcf86cd799439011");

        await mongoose.disconnect();
        console.log("✅ Seeding completed");

        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
})();
