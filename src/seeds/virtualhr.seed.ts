import mongoose from "mongoose";
import { config } from "dotenv";

config();

const seedVirtualHRData = async () => {
  try {
    const dbUrl = process.env.MONGODB_URI;
    if (!dbUrl) {
      console.error("❌ MONGODB_URI is not set");
      process.exit(1);
    }

    await mongoose.connect(dbUrl);
    console.log("✅ Connected to MongoDB");

    // Get the VirtualHR and VirtualHRRequest models
    const db = mongoose.connection;
    const VirtualHR = mongoose.model("VirtualHR", new mongoose.Schema({}, { strict: false }));
    const VirtualHRRequest = mongoose.model("VirtualHRRequest", new mongoose.Schema({}, { strict: false }));

    // Check and seed Virtual HR data
    const virtualHRCount = await VirtualHR.countDocuments();
    if (virtualHRCount === 0) {
      const roleId = new mongoose.Types.ObjectId();
      
      const virtualHRs = [
        {
          name: "Priya HR Consultant",
          email: "priya.hr@workersahaye.com",
          mobile: "9876543210",
          password: "$2b$10$vV3b.Nz0ZgD3tV.eN8K4BeOkR0Z6K0L9M8N7O6P5Q4R3S2T1U0V", // hashed
          role: roleId,
          bio: "Expert in HR consulting with 12+ years experience",
          experienceInYears: 12,
          languagesSpoken: ["English", "Hindi"],
          expertiseAreas: ["Recruitment", "Employee Relations"],
          preferredIndustries: ["IT", "Finance"],
          availableDays: ["Monday", "Wednesday", "Friday"],
          communicationModes: ["Google Meet", "Phone Call"],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Rahul Senior HR",
          email: "rahul.hr@workersahaye.com",
          mobile: "9123456789",
          password: "$2b$10$vV3b.Nz0ZgD3tV.eN8K4BeOkR0Z6K0L9M8N7O6P5Q4R3S2T1U0V",
          role: roleId,
          bio: "Talent management specialist",
          experienceInYears: 10,
          languagesSpoken: ["English", "Hindi", "Tamil"],
          expertiseAreas: ["Talent Management", "Training"],
          preferredIndustries: ["Healthcare", "Manufacturing"],
          availableDays: ["Tuesday", "Thursday"],
          communicationModes: ["Zoom", "WhatsApp"],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Anjali HR Manager",
          email: "anjali.hr@workersahaye.com",
          mobile: "9234567890",
          password: "$2b$10$vV3b.Nz0ZgD3tV.eN8K4BeOkR0Z6K0L9M8N7O6P5Q4R3S2T1U0V",
          role: roleId,
          bio: "Organizational development expert",
          experienceInYears: 8,
          languagesSpoken: ["English", "Hindi"],
          expertiseAreas: ["Organizational Development", "Change Management"],
          preferredIndustries: ["Retail", "Hospitality"],
          availableDays: ["Monday", "Tuesday", "Wednesday"],
          communicationModes: ["Google Meet", "Phone Call", "Zoom"],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const virtualHRResult = await VirtualHR.insertMany(virtualHRs);
      console.log(`✅ Seeded ${virtualHRResult.length} Virtual HR records`);
    } else {
      console.log(`✅ Virtual HR data already exists (${virtualHRCount} records)`);
    }

    // Check and seed Virtual HR Request data
    const virtualHRRequestCount = await VirtualHRRequest.countDocuments();
    if (virtualHRRequestCount === 0) {
      const adminId = new mongoose.Types.ObjectId();
      
      const virtualHRRequests = [
        {
          companyName: "TechCorp India Pvt Ltd",
          contactPerson: "Sharma",
          email: "hr@techcorp.com",
          mobileNumber: "9876543210",
          minWage: 25000,
          communicationMode: "Google Meet",
          requestedName: "HR Consultation - Hiring Strategy",
          description: "Need HR consulting for building a strong hiring strategy",
          status: "pending",
          postedBy: adminId,
          assignedTo: adminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          companyName: "Global Finance Solutions",
          contactPerson: "Patel",
          email: "hr@globalfinance.com",
          mobileNumber: "9123456789",
          minWage: 30000,
          communicationMode: "Zoom",
          requestedName: "Employee Relations Training",
          description: "Need training for our HR team on employee relations",
          status: "in-progress",
          postedBy: adminId,
          assignedTo: adminId,
          createdAt: new Date("2026-06-15"),
          updatedAt: new Date("2026-06-18"),
        },
        {
          companyName: "Healthcare Solutions Ltd",
          contactPerson: "Kumar",
          email: "hr@healthcare.com",
          mobileNumber: "9234567890",
          minWage: 28000,
          communicationMode: "Phone Call",
          requestedName: "Compliance & Legal HR Review",
          description: "Need HR compliance review and legal guidance",
          status: "completed",
          postedBy: adminId,
          assignedTo: adminId,
          completedAt: new Date("2026-06-10"),
          createdAt: new Date("2026-05-20"),
          updatedAt: new Date("2026-06-10"),
        },
        {
          companyName: "Manufacturing Industries Inc",
          contactPerson: "Singh",
          email: "hr@manufacturing.com",
          mobileNumber: "9345678901",
          minWage: 22000,
          communicationMode: "WhatsApp",
          requestedName: "Payroll & Benefits Setup",
          description: "Setting up payroll system and benefits structure",
          status: "pending",
          postedBy: adminId,
          assignedTo: adminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const virtualHRRequestResult = await VirtualHRRequest.insertMany(virtualHRRequests);
      console.log(`✅ Seeded ${virtualHRRequestResult.length} Virtual HR Request records`);
    } else {
      console.log(`✅ Virtual HR Request data already exists (${virtualHRRequestCount} records)`);
    }

    console.log("\n✅ All seed data completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seedVirtualHRData();
