import mongoose, { Document, Model, Schema } from "mongoose";

export enum HRMasterType {
  HR_LEVEL = "hrLevel",
  SERVICE_TYPE = "serviceType",
  PREFERRED_HR_ROLE = "preferredHrRole",
  COMMUNICATION_MODE = "communicationMode",
  EMPLOYMENT_TYPE = "employmentType",
  JOB_DURATION = "jobDuration",
  BADGE = "badge",
  EXPERIENCE = "experience",
  JOB_SHIFT = "JobShift",
  CONTRACT_DURATIONS = "ContractDuration",
  JOINING_PREFERENCE = "joiningPreference",
  ESIC_SERVICE_TYPE ="esic_service_type",
  EXCLUSIVE_SUPPORT_SERVICE = "exclusive_support_service",
  CANDIDATE_AVAILABILITY_FILTER = "candidateAvailabilityFilter",
  WORK_MODE = "workMode",
  PERSONAL_ASSITANT_CITY = "PA_CITY",
  PERSONAL_ASSITANT_STATE = "PA_STATE",
  SKILL_LEVEL = "skillLevel",
  CANDIDATE_AVAILABILITY = "candidateAvailability",
  EMPLOYMENT_TIME = "employmentTime",
  SHIFT = "shift",
  TYPE_OF_COMPANY = "typeOfCompany",
  AGENCY_BADGE = "agencyBadge",
  EMPLOYER_BADGE = "employerBadge",
  WORKER_BADGE = "workerBadge",
  TYPE_OF_ESTABLISHMENT = "typeOfEstablishment",
  OTHER = "other",
  VIRTUAL_HR = "virtualHR",
  VIRTUAL_RECRUITER = "virtualRecruiter",
  LANGUAGE = "language",
  COMPLIANCE_TYPE = "complianceType",
  TRAINING_CATEGORY = "trainingCategory",
  TRAINING_MODE = "trainingMode",
  HIRING_TYPE = "hiringType",
  COMPLIANCE_FREQUENCY = "complianceFrequency",
  POST_TYPE = "postType",
  VISIBILITY = "visibility",
  RATING = "rating",
  JOB_TYPE = "jobType",
}

export enum HRMasterStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface IHRMaster extends Document {
  name: string;
  order: number;
  status: HRMasterStatus;
  type: HRMasterType;
}

const HRMasterSchema: Schema<IHRMaster> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    order: { type: Number, default: 0, index: true },
    status: {
      type: String,
      enum: Object.values(HRMasterStatus),
      default: HRMasterStatus.ACTIVE,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(HRMasterType),
      required: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true },
);

HRMasterSchema.index({ type: 1, name: 1 }, { unique: true });
HRMasterSchema.index({ type: 1, order: 1, name: 1 });

const HRMaster: Model<IHRMaster> = mongoose.model<IHRMaster>(
  "HRMaster",
  HRMasterSchema,
);

export default HRMaster;













