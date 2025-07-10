import mongoose, { Document, Schema, Model } from "mongoose";

export enum JobCategoryType {
  SALES = "Sales",
  LEGAL = "Legal",
  DESIGN = "Design",
  ENERGY = "Energy",
  FINANCE = "Finance",
  SERVICE = "Service",
  SECURITY = "Security",
  CREATIVE = "Creative",
  FREELANCE = "Freelance",
  MARKETING = "Marketing",
  LOGISTICS = "Logistics",
  EDUCATION = "Education",
  TECHNICAL = "Technical",
  MANAGEMENT = "Management",
  HEALTHCARE = "Healthcare",
  NGO = "NGO / Non-Profit",
  OPERATIONS = "Operations",
  GOVERNMENT = "Government",
  CONSULTING = "Consulting",
  ENGINEERING = "Engineering",
  REAL_ESTATE = "Real Estate",
  AGRICULTURE = "Agriculture",
  PROCUREMENT = "Procurement",
  CONSTRUCTION = "Construction",
  SUPPLY_CHAIN = "Supply Chain",
  NON_TECHNICAL = "Non-Technical",
  ADMINISTRATION = "Administration",
  DATA_ANALYTICS = "Data Analytics",
  CONTENT_WRITING = "Content Writing",
  HUMAN_RESOURCES = "Human Resources",
  CUSTOMER_SUPPORT = "Customer Support",
  EVENT_MANAGEMENT = "Event Management",
  BUSINESS_ANALYSIS = "Business Analysis",
  DIGITAL_MARKETING = "Digital Marketing",
  TELECOMMUNICATION = "Telecommunication",
  TRAVEL_AND_TOURISM = "Travel and Tourism",
  PRODUCT_MANAGEMENT = "Product Management",
  PROJECT_MANAGEMENT = "Project Management",
  INFORMATION_TECHNOLOGY = "Information Technology",
  MEDIA_AND_ENTERTAINMENT = "Media and Entertainment",
  RESEARCH_AND_DEVELOPMENT = "Research and Development",
}

export interface IJobCategory extends Document {
  name: string;
  type: JobCategoryType;
  description?: string;
  icon?: string; // optional icon for UI display
  parentCategory?: mongoose.Types.ObjectId; // optional for sub-categories
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const JobCategorySchema: Schema<IJobCategory> = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: {
      type: String,
      enum: Object.values(JobCategoryType),
      required: true,
    },
    description: { type: String, trim: true },
    icon: { type: String },
    parentCategory: { type: Schema.Types.ObjectId, ref: "JobCategory" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// To support filtering by category type (e.g., all 'Technical' jobs)
JobCategorySchema.index({ type: 1 });

// To filter only active categories
JobCategorySchema.index({ isActive: 1 });

// For nested category filtering (sub-category/parent relationship)
JobCategorySchema.index({ parentCategory: 1 });

const JobCategory: Model<IJobCategory> = mongoose.model<IJobCategory>(
  "JobCategory",
  JobCategorySchema
);

export default JobCategory;
