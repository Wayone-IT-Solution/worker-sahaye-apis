import ServiceLocation from "../modals/servicelocation.model";
import SupportService from "../modals/supportservice.model";

export const seedServiceLocations = async (adminUserId?: string) => {
  try {
    // Check if locations already exist
    const existingCount = await ServiceLocation.countDocuments();
    if (existingCount > 0) {
      console.log(`✅ Service Locations already exist (${existingCount} records). Skipping seed.`);
      return;
    }

    const defaultAdminId = "507f1f77bcf86cd799439011"; // Placeholder, use actual admin ID

    // Get all services from database
    const services = await SupportService.find({}).sort({ createdAt: 1 });

    if (services.length === 0) {
      console.log("⚠️ No support services found in database. Please seed support services first.");
      return;
    }

    // Define unique locations for each service
    const serviceLocationsMap: { [key: string]: string[] } = {
      "Activate UAN & KYC": ["Mumbai", "Pune", "Delhi"],
      "Check Balance & Passbook": ["Bangalore", "Hyderabad", "Chennai"],
      "Apply for PF Withdrawal": ["Delhi", "Kolkata", "Jaipur"],
      "Download Payslip & Deductions": ["Ahmedabad", "Surat", "Vadodara"],
      "Transfer PF to New Job": ["Mumbai", "Bangalore", "Hyderabad"],

      "Register for ESIC": ["Chennai", "Kolkata", "Mumbai"],
      "Claim Medical Benefits": ["Delhi", "Bangalore", "Pune"],
      "Claim Disability Benefits": ["Ahmedabad", "Lucknow", "Indore"],
      "Claim Maternity/Paternity Benefits": ["Mumbai", "Delhi", "Bangalore"],
      "Download ESIC Statement": ["Hyderabad", "Chennai", "Kolkata"],

      "Personal Loan Application": ["Mumbai", "Delhi", "Bangalore", "Hyderabad"],
      "Emergency Loan": ["Pune", "Ahmedabad", "Jaipur"],
      "Business Loan": ["Kolkata", "Lucknow", "Chandigarh"],
      "Education Loan": ["Delhi", "Mumbai", "Bangalore"],
      "Track Loan Status": ["Chennai", "Hyderabad", "Pune"],

      "Workplace Safety Guidelines": ["Mumbai", "Ahmedabad", "Surat"],
      "Know Your Rights as a Worker": ["Delhi", "Kolkata", "Chennai"],
      "File Labour Complaint": ["Bangalore", "Pune", "Lucknow"],
      "Claim Gratuity & Severance": ["Mumbai", "Delhi", "Hyderabad"],
      "Occupational Health Services": ["Ahmedabad", "Chennai", "Kolkata"],
    };

    const locationRecords: any = [];

    // Create locations for each service individually
    services.forEach((service) => {
      const locations = serviceLocationsMap[service.title] || [];

      if (locations.length === 0) {
        console.log(`⚠️ No locations defined for service: ${service.title}`);
        return;
      }

      // Create location entries for this specific service
      locations.forEach((city) => {
        locationRecords.push({
          serviceId: service._id,
          location: city,
          status: "active",
          createdBy: adminUserId || defaultAdminId,
        });
      });
    });

    // Use insertMany with ordered: false to skip duplicates
    const result = await ServiceLocation.insertMany(locationRecords, { ordered: false }).catch(
      (err: any) => {
        // If error is just duplicate key error, continue (some records may have been inserted)
        if (err.code === 11000) {
          console.log("⚠️ Some duplicate locations were skipped (expected behavior)");
          return err.insertedDocs || [];
        }
        throw err;
      }
    );

    const resultArray = Array.isArray(result) ? result : [];
    console.log(`✅ ${resultArray.length} service locations seeded successfully!`);
    console.log(`   - ${services.length} individual services with unique location mappings`);
  } catch (error: any) {
    console.error("❌ Error seeding service locations:", error.message);
    throw error;
  }
};
