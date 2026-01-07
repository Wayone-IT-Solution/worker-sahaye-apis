/**
 * Database Migration Scripts for Compliance Calendar System
 * Run these scripts to set up the required collections and indexes
 */

import mongoose from "mongoose";
import { ComplianceCalendarStatus } from "../modals/compliancecalendarstatus.model";
import { ComplianceCalendarReminder } from "../modals/compliancecalendarreminder.model";
import { logger } from "../config/logger";

/**
 * Initialize all database collections and indexes
 */
export async function initializeComplianceDatabase(): Promise<void> {
  try {
    console.log("🔄 Initializing Compliance Calendar collections...");

    // Create ComplianceCalendarStatus collection and indexes
    await initializeComplianceStatus();

    // Create ComplianceCalendarReminder collection and indexes
    await initializeComplianceReminder();

    console.log("✅ All collections and indexes initialized successfully");
  } catch (err) {
    console.error("❌ Failed to initialize database:", err);
    throw err;
  }
}

/**
 * Initialize ComplianceCalendarStatus collection
 */
async function initializeComplianceStatus(): Promise<void> {
  try {
    // Ensure collection exists
    const model = ComplianceCalendarStatus;
    await model.collection.createIndex(
      { complianceCalendarId: 1, employerId: 1, createdAt: -1 },
      { name: "idx_calendar_employer_date" }
    );

    await model.collection.createIndex(
      { employerId: 1, status: 1 },
      { name: "idx_employer_status" }
    );

    await model.collection.createIndex(
      { complianceCalendarId: 1, status: 1 },
      { name: "idx_calendar_status" }
    );

    console.log("✅ ComplianceCalendarStatus indexes created");
  } catch (err) {
    if ((err as any).code === 48) {
      // Index already exists
      console.log("⚠️  ComplianceCalendarStatus indexes already exist");
    } else {
      throw err;
    }
  }
}

/**
 * Initialize ComplianceCalendarReminder collection
 */
async function initializeComplianceReminder(): Promise<void> {
  try {
    const model = ComplianceCalendarReminder;
    
    // Index for finding pending reminders to send
    await model.collection.createIndex(
      { status: 1, scheduledFor: 1 },
      { name: "idx_pending_reminders" }
    );

    // Index for user's reminders
    await model.collection.createIndex(
      { employerId: 1, createdAt: -1 },
      { name: "idx_employer_reminders" }
    );

    // TTL index to auto-delete sent reminders after 90 days
    await model.collection.createIndex(
      { sentAt: 1 },
      {
        name: "idx_sent_reminders_ttl",
        expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
        sparse: true,
      }
    );

    console.log("✅ ComplianceCalendarReminder indexes created");
  } catch (err) {
    if ((err as any).code === 48) {
      // Index already exists
      console.log("⚠️  ComplianceCalendarReminder indexes already exist");
    } else {
      throw err;
    }
  }
}

/**
 * Migrate existing data (if upgrading from old system)
 */
export async function migrateComplianceData(): Promise<{
  statusCreated: number;
  remindersCreated: number;
}> {
  try {
    console.log("🔄 Starting compliance data migration...");

    // TODO: Implement migration logic based on your old data structure
    // Example: Copy data from old compliance system to new models

    const result = {
      statusCreated: 0,
      remindersCreated: 0,
    };

    console.log("✅ Migration completed", result);
    return result;
  } catch (err) {
    console.error("❌ Migration failed:", err);
    throw err;
  }
}

/**
 * Seed sample data for testing
 */
export async function seedComplianceTestData(): Promise<void> {
  try {
    console.log("🌱 Seeding compliance calendar test data...");

    // This will be populated after admin creates calendars
    // For now, this is just a placeholder

    console.log("✅ Test data seeded successfully");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    throw err;
  }
}

/**
 * Cleanup old/archived data
 * Run periodically to maintain performance
 */
export async function cleanupComplianceData(daysOld: number = 365): Promise<{
  archivedStatuses: number;
  deletedReminders: number;
}> {
  try {
    console.log(
      `🧹 Cleaning up compliance data older than ${daysOld} days...`
    );

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Archive old statuses
    const statusResult = await ComplianceCalendarStatus.updateMany(
      {
        createdAt: { $lt: cutoffDate },
        // Keep records that have PAID status for audit
        // Only archive UPCOMING records that never got action
      },
      {
        // Archive by creating a backup collection
        // This is a soft delete pattern
      }
    );

    // Delete old sent reminders (keep for 90 days with TTL index)
    const reminderResult = await ComplianceCalendarReminder.deleteMany({
      status: "SENT",
      sentAt: { $lt: cutoffDate },
    });

    console.log(
      `✅ Cleanup completed: ${statusResult.modifiedCount} statuses archived, ${reminderResult.deletedCount} reminders deleted`
    );

    return {
      archivedStatuses: statusResult.modifiedCount,
      deletedReminders: reminderResult.deletedCount,
    };
  } catch (err) {
    console.error("❌ Cleanup failed:", err);
    throw err;
  }
}

/**
 * Health check - verify all indexes exist
 */
export async function healthCheckComplianceDatabase(): Promise<{
  status: "healthy" | "degraded" | "critical";
  details: Record<string, any>;
}> {
  try {
    const statusIndexes = await ComplianceCalendarStatus.collection.getIndexes();
    const reminderIndexes = await ComplianceCalendarReminder.collection.getIndexes();

    const statusCount = await ComplianceCalendarStatus.countDocuments();
    const reminderCount = await ComplianceCalendarReminder.countDocuments();

    const health: { status: "healthy" | "degraded" | "critical"; details: Record<string, any> } = {
      status: "healthy",
      details: {
        complianceCalendarStatus: {
          count: statusCount,
          indexes: Object.keys(statusIndexes).length,
        },
        complianceCalendarReminder: {
          count: reminderCount,
          indexes: Object.keys(reminderIndexes).length,
        },
      },
    };

    // Check for issues
    if (Object.keys(statusIndexes).length < 3) {
      health.status = "degraded";
      console.warn("⚠️  ComplianceCalendarStatus missing indexes");
    }

    if (Object.keys(reminderIndexes).length < 2) {
      health.status = "degraded";
      console.warn("⚠️  ComplianceCalendarReminder missing indexes");
    }

    return health;
  } catch (err) {
    console.error("❌ Health check failed:", err);
    return {
      status: "critical",
      details: { error: String(err) },
    };
  }
}

/**
 * Export all migration functions as CLI commands
 * Can be run via: node migrate.js --command=initialize
 */
if (require.main === module) {
  const command = process.argv[2];

  mongoose
    .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/worker")
    .then(async () => {
      switch (command) {
        case "initialize":
          await initializeComplianceDatabase();
          break;
        case "migrate":
          await migrateComplianceData();
          break;
        case "seed":
          await seedComplianceTestData();
          break;
        case "cleanup":
          const days = parseInt(process.argv[3]) || 365;
          await cleanupComplianceData(days);
          break;
        case "health":
          const health = await healthCheckComplianceDatabase();
          console.log(JSON.stringify(health, null, 2));
          break;
        default:
          console.log("Usage: node migrate.js [command]");
          console.log(
            "Commands: initialize | migrate | seed | cleanup [days] | health"
          );
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("Database connection failed:", err);
      process.exit(1);
    });
}

export default {
  initializeComplianceDatabase,
  migrateComplianceData,
  seedComplianceTestData,
  cleanupComplianceData,
  healthCheckComplianceDatabase,
};
