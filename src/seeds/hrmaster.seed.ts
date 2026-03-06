import mongoose from "mongoose";
import { config } from "../config/config";
import HRMaster, {
  HRMasterStatus,
  HRMasterType,
} from "../modals/hrmaster.model";
import { Badge } from "../modals/badge.model";

const MONGO_URI = `${config.db.url}/${config.db.name}`;

const baseSeeds: Array<{
  type: HRMasterType;
  name: string;
  status: HRMasterStatus;
}> = [
  // Service Type
  { type: HRMasterType.SERVICE_TYPE, name: "Virtual HR", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.SERVICE_TYPE, name: "Recruitment", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.SERVICE_TYPE, name: "HR Consulting", status: HRMasterStatus.ACTIVE },

  // HR Level
  { type: HRMasterType.HR_LEVEL, name: "Executive", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.HR_LEVEL, name: "Manager", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.HR_LEVEL, name: "Senior Manager", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.HR_LEVEL, name: "Director", status: HRMasterStatus.ACTIVE },

  // Preferred HR Role
  { type: HRMasterType.PREFERRED_HR_ROLE, name: "Onboarding", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.PREFERRED_HR_ROLE, name: "Recruitment", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.PREFERRED_HR_ROLE, name: "Training", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.PREFERRED_HR_ROLE, name: "Payroll", status: HRMasterStatus.ACTIVE },

  // Communication Mode
  { type: HRMasterType.COMMUNICATION_MODE, name: "Phone Call", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.COMMUNICATION_MODE, name: "Email", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.COMMUNICATION_MODE, name: "Video Call", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.COMMUNICATION_MODE, name: "In-person", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.COMMUNICATION_MODE, name: "Chat/WhatsApp", status: HRMasterStatus.ACTIVE },

  // Employment Type
  { type: HRMasterType.EMPLOYMENT_TYPE, name: "Full-time", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.EMPLOYMENT_TYPE, name: "Part-time", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.EMPLOYMENT_TYPE, name: "Contract", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.EMPLOYMENT_TYPE, name: "Temporary", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.EMPLOYMENT_TYPE, name: "Internship", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.EMPLOYMENT_TYPE, name: "Freelance", status: HRMasterStatus.ACTIVE },

  // Job Duration
  { type: HRMasterType.JOB_DURATION, name: "Short-term", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.JOB_DURATION, name: "Long-term", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.JOB_DURATION, name: "Project-based", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.JOB_DURATION, name: "Permanent", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.JOB_DURATION, name: "Seasonal", status: HRMasterStatus.ACTIVE },

  // Experience
  { type: HRMasterType.EXPERIENCE, name: "Fresher", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.EXPERIENCE, name: "1-3 years", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.EXPERIENCE, name: "3-5 years", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.EXPERIENCE, name: "5-8 years", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.EXPERIENCE, name: "8+ years", status: HRMasterStatus.ACTIVE },

  // Candidate Availability Filter
  { type: HRMasterType.CANDIDATE_AVAILABILITY_FILTER, name: "Immediate", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.CANDIDATE_AVAILABILITY_FILTER, name: "15 Days", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.CANDIDATE_AVAILABILITY_FILTER, name: "30 Days", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.CANDIDATE_AVAILABILITY_FILTER, name: "60 Days", status: HRMasterStatus.ACTIVE },
  { type: HRMasterType.CANDIDATE_AVAILABILITY_FILTER, name: "90 Days", status: HRMasterStatus.ACTIVE },
];

async function seedHRMasters() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    const badges = await Badge.find({}, { name: 1, isActive: 1 }).lean();
    const badgeSeeds = badges.map((badge) => ({
      type: HRMasterType.BADGE,
      name: badge.name,
      status: badge.isActive ? HRMasterStatus.ACTIVE : HRMasterStatus.INACTIVE,
    }));

    const seeds = [...baseSeeds, ...badgeSeeds];
    const operations = seeds.map((item) => ({
      updateOne: {
        filter: { type: item.type, name: item.name },
        update: { $setOnInsert: item },
        upsert: true,
      },
    }));

    if (operations.length) {
      const result = await HRMaster.bulkWrite(operations);
      console.log(
        `✅ HR master seeded: upserted ${result.upsertedCount}, matched ${result.matchedCount}`
      );
    } else {
      console.log("ℹ️ No seed data found.");
    }
  } catch (error) {
    console.error("❌ HR master seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("✅ MongoDB disconnected");
  }
}

seedHRMasters();
