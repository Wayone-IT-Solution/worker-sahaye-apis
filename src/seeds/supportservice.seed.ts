import SupportService from "../modals/supportservice.model";

export const seedSupportServices = async (adminUserId?: string) => {
  try {
    const defaultAdminId = "507f1f77bcf86cd799439011";

    const services = [
      // ==================== EPFO SERVICES ====================
      {
        order: 1,
        title: "Activate UAN & KYC",
        subtitle: "Activate your UAN in 2 minutes – start managing your PF online today",
        description: [
          "Update KYC (Aadhaar, PAN, Bank)",
          "Activate your UAN instantly",
        ],
        serviceFor: "EPFO",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 2,
        title: "Check Balance & Passbook",
        subtitle: "Know your PF savings instantly – just enter UAN & OTP",
        description: [
          "View Passbook",
          "Check Balance via SMS/Missed Call",
        ],
        serviceFor: "EPFO",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 3,
        title: "Apply for PF Withdrawal",
        subtitle: "Need funds? Apply for PF withdrawal directly from your phone – paperless and secure.",
        description: [
          "Apply for PF withdrawal",
          "Apply for Partial Withdrawal",
          "Apply for Pension",
        ],
        serviceFor: "EPFO",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 4,
        title: "Transfer PF Account",
        subtitle: "Switching jobs? Transfer your PF account in a few steps.",
        description: [
          "Transfer PF Account",
          "Track Transfer Status",
        ],
        serviceFor: "EPFO",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 5,
        title: "Lodge Complaint",
        subtitle: "Facing an issue? Raise a complaint and get official EPFO help",
        description: [
          "Lodge Complaint",
          "Check Complaint Status",
        ],
        serviceFor: "EPFO",
        createdBy: adminUserId || defaultAdminId,
      },

      // ==================== ESIC SERVICES ====================
      {
        order: 1,
        title: "Medical Benefits",
        subtitle: "Full healthcare for you and your family – right from day one of coverage.",
        description: [
          "Full Medical Care (OPD, hospitalization, medicines)",
          "Specialist & Super-Specialty Services",
          "Diagnostic & Laboratory Services",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 2,
        title: "Sickness Benefits",
        subtitle: "Get paid while you recover from illness.",
        description: [
          "Standard Sickness Benefit – 70% wages up to 91 days/year",
          "Enhanced Sickness Benefit – 90% wages for sterilization leave",
          "Extended Sickness Benefit – Long-term diseases (up to 2 years)",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 3,
        title: "Maternity Benefits",
        subtitle: "Financial support and medical care during pregnancy, delivery, or adoption.",
        description: [
          "Medical care during maternity",
          "Cash benefit during leave period",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 4,
        title: "Disablement Benefits",
        subtitle: "Disablement Benefits",
        description: [
          "Temporary Disablement – 90% wages until recovery",
          "Permanent Disablement – Lifetime pension based on disability %",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 5,
        title: "Dependants’ Benefits",
        subtitle: "Support for your family in case of work-related death.",
        description: [
          "Monthly pension – 90% wages to dependents",
          "Funeral Expenses – Up to ₹15,000",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 6,
        title: "Unemployment Benefits (ABVKY)",
        subtitle: "Financial support if you lose your job unexpectedly.",
        description: [
          "50% of wages up to 90 days for eligible unemployed persons",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 7,
        title: "Rehabilitation Benefits",
        subtitle: "Helping you recover and get back to work.",
        description: [
          "Vocational Rehabilitation",
          "Physical Rehabilitation Services",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 8,
        title: "Old Age Medical Care",
        subtitle: "Affordable medical cover after retirement.",
        description: [
          "Annual medical cover for ₹120 for retired insured persons and spouse",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 9,
        title: "ESIC Locations",
        subtitle: "Find & locate ESIC offices, dispensaries and hospitals.",
        description: [
          "Find ESIC Hospitals & Dispensaries",
          "GPS-enabled ESIC Office locator",
        ],
        serviceFor: "ESIC",
        createdBy: adminUserId || defaultAdminId,
      },

      // ==================== LWF SERVICES ====================
      {
        order: 1,
        title: "Higher Education Assistance Scheme",
        subtitle: "Invest in your child’s future with financial help for higher education.",
        description: [
          "₹20,000 for MBBS, ₹10,000 for other UG courses",
          "Std. 12 ≥70 percentile, parent employed ≥1 year, LWF deposited",
        ],
        serviceFor: "LWF",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 2,
        title: "Worker Accident Assistance Scheme",
        subtitle: "Financial support for workplace accidents.",
        description: [
          "40–70% disability → ₹25,000",
          "Above 70% disability → ₹50,000",
          "Apply within 2 years, LWF deposited ≥1 year",
        ],
        serviceFor: "LWF",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 3,
        title: "Worker Cycle Subsidy Assistance Scheme",
        subtitle: "Get ₹1,500 subsidy to purchase a bicycle.",
        description: [
          "₹1,500 once during employment",
          "Employed ≥1 year, valid bill, chassis ≥22 inches",
        ],
        serviceFor: "LWF",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 4,
        title: "Women Worker Marriage Assistance Scheme",
        subtitle: "Marriage assistance of ₹11,000 for women workers.",
        description: [
          "₹11,000 Kanyadan",
          "Apply within 1 year of marriage, LWF deposited",
        ],
        serviceFor: "LWF",
        createdBy: adminUserId || defaultAdminId,
      },
      {
        order: 5,
        title: "Labourer Accidental Death Assistance Scheme",
        subtitle: "Financial protection for worker’s family.",
        description: [
          "₹2,00,000 assistance",
          "Apply within 2 years, LWF deposited",
        ],
        serviceFor: "LWF",
        createdBy: adminUserId || defaultAdminId,
      },
    ];

    await SupportService.deleteMany({});
    const result = await SupportService.insertMany(services);

    console.log(`✅ ${result.length} support services seeded successfully!`);
  } catch (error: any) {
    console.error("❌ Error seeding support services:", error.message);
    throw error;
  }
};
