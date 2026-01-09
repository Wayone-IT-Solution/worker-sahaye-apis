import SupportService from "../modals/supportservice.model";

export const seedSupportServices = async (adminUserId?: string) => {
  try {
    // Check if services already exist
    const existingCount = await SupportService.countDocuments();
    if (existingCount > 0) {
      console.log(`✅ Support Services already exist (${existingCount} records). Skipping seed.`);
      return;
    }

    const defaultAdminId = "507f1f77bcf86cd799439011"; // Placeholder, use actual admin ID

    const services = [
      // ==================== EPFO SERVICES ====================
      {
        title: "Activate UAN & KYC",
        subtitle: "Activate your UAN in 2 minutes – start managing your PF online today",
        description: [
          "Update KYC (Aadhaar, PAN, Bank)",
          "Activate your UAN instantly",
          "Link to EPFO portal",
        ],
        serviceFor: "EPFO",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Check Balance & Passbook",
        subtitle: "Know your PF savings instantly – just enter UAN & OTP",
        description: [
          "View Passbook",
          "Check Balance via SMS/Missed Call",
          "Download passbook statement",
          "Track contribution history",
        ],
        serviceFor: "EPFO",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Apply for PF Withdrawal",
        subtitle: "Need funds? Apply for PF withdrawal directly from your phone – paperless and secure",
        description: [
          "Apply for Full Withdrawal",
          "Apply for Partial Withdrawal",
          "Apply for Pension",
          "Track withdrawal status",
        ],
        serviceFor: "EPFO",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Download Payslip & Deductions",
        subtitle: "Access your payslips and contribution details anytime, anywhere",
        description: [
          "Download monthly payslip",
          "View PF contributions",
          "Check income tax deductions",
          "Verify salary records",
        ],
        serviceFor: "EPFO",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Transfer PF to New Job",
        subtitle: "Seamlessly transfer your PF account when you switch jobs",
        description: [
          "Form 13 submission",
          "Transfer PF to new employer",
          "Track transfer status",
          "Get transfer certificate",
        ],
        serviceFor: "EPFO",
        createdBy: adminUserId || defaultAdminId,
      },

      // ==================== ESIC SERVICES ====================
      {
        title: "Register for ESIC",
        subtitle: "Get ESIC coverage for your family – complete medical protection",
        description: [
          "ESIC registration for workers",
          "Add family members to coverage",
          "Get ESIC card instantly",
          "Verify registration status",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Claim Medical Benefits",
        subtitle: "Access cashless treatment at ESIC hospitals nationwide",
        description: [
          "Find ESIC hospitals near you",
          "Get emergency treatment",
          "Avail outpatient services",
          "Download treatment authorization",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Claim Disability Benefits",
        subtitle: "Get financial support if you've suffered work-related injury or disability",
        description: [
          "File disability claim",
          "Get monthly disability allowance",
          "Track claim status",
          "Appeal against claim decision",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Claim Maternity/Paternity Benefits",
        subtitle: "Receive financial assistance during maternity and paternity leave",
        description: [
          "Maternity benefit claim",
          "Paternity benefit claim",
          "Bonus assistance",
          "Get payment status updates",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Download ESIC Statement",
        subtitle: "Get your ESIC payment and contribution records anytime",
        description: [
          "Download contribution statement",
          "View payment history",
          "Get benefit certificates",
          "Export records as PDF",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },

      // ==================== LOAN SERVICES ====================
      {
        title: "Personal Loan Application",
        subtitle: "Get quick personal loans with minimal documentation – approve in 24 hours",
        description: [
          "Apply for instant personal loan",
          "Easy approval process",
          "Minimal documents required",
          "Flexible repayment options",
        ],
        serviceFor: "LOAN",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Emergency Loan",
        subtitle: "Get emergency financial support within hours of application",
        description: [
          "Ultra-fast approval (within 2 hours)",
          "No collateral required",
          "Instant disbursal",
          "Flexible EMI options",
        ],
        serviceFor: "LOAN",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Business Loan",
        subtitle: "Start or expand your business with affordable business loans",
        description: [
          "Loans for business setup",
          "Working capital assistance",
          "Equipment financing",
          "Special rates for self-employed",
        ],
        serviceFor: "LOAN",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Education Loan",
        subtitle: "Finance your or your child's education with special education loan schemes",
        description: [
          "Study abroad loan",
          "Domestic education loan",
          "Low interest rates",
          "Easy moratorium options",
        ],
        serviceFor: "LOAN",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Track Loan Status",
        subtitle: "Monitor your loan application, approval, and disbursement progress",
        description: [
          "Real-time application tracking",
          "Check approval status",
          "View disbursement timeline",
          "Get SMS notifications",
        ],
        serviceFor: "LOAN",
        createdBy: adminUserId || defaultAdminId,
      },

      // ==================== LABOUR SERVICES ====================
      {
        title: "Workplace Safety Guidelines",
        subtitle: "Learn essential workplace safety practices to prevent injuries",
        description: [
          "Safety equipment guidance",
          "Emergency procedures",
          "Hazard identification",
          "Incident reporting process",
        ],
        serviceFor: "LABOUR",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Know Your Rights as a Worker",
        subtitle: "Understand your legal rights and protections as an employee",
        description: [
          "Minimum wage information",
          "Working hours regulations",
          "Leave and holiday entitlements",
          "Grievance redressal process",
        ],
        serviceFor: "LABOUR",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "File Labour Complaint",
        subtitle: "Report unfair labor practices and wage-related issues officially",
        description: [
          "Illegal termination complaint",
          "Wage non-payment complaint",
          "Harassment/discrimination report",
          "Track complaint status online",
        ],
        serviceFor: "LABOUR",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Claim Gratuity & Severance",
        subtitle: "Understand and claim gratuity, bonus, and severance benefits due to you",
        description: [
          "Gratuity calculation",
          "Severance package details",
          "File claim application",
          "Get payment assistance",
        ],
        serviceFor: "LABOUR",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        title: "Occupational Health Services",
        subtitle: "Access health checkups and wellness programs for workers",
        description: [
          "Annual health screening",
          "Occupational disease prevention",
          "Mental health support",
          "Wellness program enrollment",
        ],
        serviceFor: "LABOUR",
        createdBy: adminUserId || defaultAdminId,
      },
    ];

    const result = await SupportService.insertMany(services);
    console.log(`✅ ${result.length} support services seeded successfully!`);
    console.log(`   - EPFO: 5 services`);
    console.log(`   - ESIC: 5 services`);
    console.log(`   - LOAN: 5 services`);
    console.log(`   - LABOUR: 5 services`);
  } catch (error: any) {
    console.error("❌ Error seeding support services:", error.message);
    throw error;
  }
};
