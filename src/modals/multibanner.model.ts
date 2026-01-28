import { Schema, model, Document } from "mongoose";

export type UserType = "worker" | "contractor" | "employer";
export interface IAttachment {
  url: string;
  s3Key: string;
  order: number;
}

export interface IPageBanner extends Document {
  type: string;
  title: string;
  createdAt: Date;
  message: string;
  updatedAt: Date;
  userType: UserType;
  description: string;
  image?: IAttachment[];
  cta?: string;
}

export enum ScreenEnum {
  CandidateContractor = "candidate_contractor",
  JobType = "job_type",
  SmartHiring = "smart_hiring",
  VirtualHR = "virtual_hr",
  VirtualRecruiter = "virtual_recruiter",
  ExclusiveSupport = "exclusive_support",
  EmployerBranding = "employer_branding",
  Community = "community",
  Endorsement = "endorsement",
  Subscription = "subscription",
  AbuseReport = "abuse_report",

  // Newly added
  PreScreenedContractors = "pre_screened_contractors",
  PreInterviewedCandidate = "pre_interviewed_candidate",
  OnDemandRequirement = "on_demand_requirement",
  ProjectBasedHiring = "project_based_hiring",

  // Additional new
  PFSupport = "pf_support",
  ESICSupport = "esic_support",
  BULKHIRING = "bulk_hiring",
  LWFSupport = "lwf_support",
  LoanSupport = "loan_support",
  CandidateBranding = "candidate_branding",
  ReferAndEarn = "refer_and_earn",
  KnowYourWages = "know_your_wages",
  Preferences = "preferences",
  CV = "CV",
  ComplianceCalender = "compliance_calender",

  // Dashboard & Help screens
  FAQ = "faq",
  WorkerDashboard = "worker_dashboard",
  ContractorDashboard = "contractor_dashboard",
  EmployerDashboard = "employer_dashboard",

  EditProfile = "edit_profile",
  CreateCV = "create_cv",
  EPFOSupport = "epfo_support",
  SkillTrainingAndCertification = "skill_training_and_certification",
  SchaduledVisits = "scheduled_visits",
  Notifications = "notifications",

  // new for agency
  SearchEmployersAndCandidates = "search_employers_and_candidates",
  JobManagement = "job_management",

  //new for employer
  SearchCandidateOrSearchAgency= "search_candidate_or_search_agency"
}

const pageBannerSchema = new Schema<IPageBanner>(
  {
    message: { type: String },
    description: { type: String },
    type: { type: String, enum: ScreenEnum },
    title: { type: String, required: true },
    image: [
      {
        url: { type: String, required: true },
        order: { type: Number, default: 0, min: 0 },
        s3Key: { type: String, required: true, unique: true },
      },
    ],
    userType: {
      type: String,
      enum: ["worker", "contractor", "employer"],
      description: { type: String, required: true },
      required: true,
    },
    cta: { type: String },
  },
  { timestamps: true }
);

const PageBannerModel = model<IPageBanner>("specific", pageBannerSchema);
export default PageBannerModel;
