import mongoose, { Document, Schema } from "mongoose";

export enum ContactAs {
  WORKER = "worker",
  EMPLOYER = "employer",
  AGENCY = "agency",
  CONTRACTOR = "contractor",
  SERVICE_PROVIDER = "service_provider",
  RECRUITER = "recruiter",
  TRAINING_PARTNER = "training_partner",
  GOVERNMENT = "government",
  OTHER = "other",
}

export enum IndustryType {
  MANUFACTURING = "manufacturing",
  CONSTRUCTION = "construction",
  LOGISTICS = "logistics",
  HEALTHCARE = "healthcare",
  HOSPITALITY = "hospitality",
  RETAIL = "retail",
  IT = "it",
  EDUCATION = "education",
  GOVERNMENT = "government",
  OTHER = "other",
}

export enum ServiceRequired {
  JOB_SEARCH_ASSISTANCE = "job_search_assistance",
  HIRE_WORKERS = "hire_workers",
  BULK_HIRING = "bulk_hiring",
  PF_ESIC_SUPPORT = "pf_esic_support",
  LABOUR_COMPLIANCE = "labour_compliance",
  PAYROLL_HR = "payroll_hr",
  TRAINING_PROGRAMS = "training_programs",
  SUBSCRIPTION_PRICING = "subscription_pricing",
  PARTNERSHIP_FRANCHISE = "partnership_franchise",
  OTHER = "other",
}

export enum ContactUrgency {
  IMMEDIATE = "immediate",
  WITHIN_7_DAYS = "within_7_days",
  WITHIN_30_DAYS = "within_30_days",
  ENQUIRY = "enquiry",
}

export enum ContactSource {
  GOOGLE = "google",
  INSTAGRAM = "instagram",
  LINKEDIN = "linkedin",
  WHATSAPP = "whatsapp",
  REFERRAL = "referral",
  ADVERTISEMENT = "advertisement",
  EVENT = "event",
  OTHER = "other",
}

export enum ContactUsStatus {
  NEW = "New",
  IN_PROGRESS = "In Progress",
  CLOSED = "Closed",
}

export interface IContactUs extends Document {
  fullName: string;
  mobileNumber: string;
  email: string;
  city: string;
  state: string;
  company?: string;

  contactAs: ContactAs;
  contactAsOther?: string;

  industryType: IndustryType;
  industryOther?: string;

  servicesRequired: ServiceRequired[];
  serviceOther?: string;

  requirementDetails?: string;
  urgency: ContactUrgency;

  sources: ContactSource[];
  sourceOther?: string;

  consentToContact: boolean;

  status: ContactUsStatus;
  isActive: boolean;

  meta?: {
    ip?: string;
    userAgent?: string;
    referrer?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const ContactUsSchema: Schema<IContactUs> = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    mobileNumber: { type: String, required: true, trim: true, maxlength: 20 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/.+@.+\..+/, "Invalid email format"],
    },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    company: { type: String, trim: true, maxlength: 200 },

    contactAs: {
      type: String,
      enum: Object.values(ContactAs),
      required: true,
      index: true,
    },
    contactAsOther: { type: String, trim: true, maxlength: 200 },

    industryType: {
      type: String,
      enum: Object.values(IndustryType),
      required: true,
      index: true,
    },
    industryOther: { type: String, trim: true, maxlength: 200 },

    servicesRequired: {
      type: [String],
      enum: Object.values(ServiceRequired),
      default: [],
      index: true,
    },
    serviceOther: { type: String, trim: true, maxlength: 200 },

    requirementDetails: { type: String, trim: true, maxlength: 2000 },

    urgency: {
      type: String,
      enum: Object.values(ContactUrgency),
      required: true,
      index: true,
    },

    sources: {
      type: [String],
      enum: Object.values(ContactSource),
      default: [],
      index: true,
    },
    sourceOther: { type: String, trim: true, maxlength: 200 },

    consentToContact: { type: Boolean, required: true, default: false },

    status: {
      type: String,
      enum: Object.values(ContactUsStatus),
      default: ContactUsStatus.NEW,
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },

    meta: {
      ip: { type: String, trim: true, maxlength: 100 },
      userAgent: { type: String, trim: true, maxlength: 500 },
      referrer: { type: String, trim: true, maxlength: 500 },
    },
  },
  { timestamps: true },
);

ContactUsSchema.index({ createdAt: -1 });
ContactUsSchema.index({ email: 1 });
ContactUsSchema.index({ mobileNumber: 1 });

export const ContactUs = mongoose.model<IContactUs>("ContactUs", ContactUsSchema);

