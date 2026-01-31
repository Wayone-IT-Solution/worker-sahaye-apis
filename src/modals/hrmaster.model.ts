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
  CANDIDATE_AVAILABILITY_FILTER = "candidateAvailabilityFilter",
}

export enum HRMasterStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface IHRMaster extends Document {
  name: string;
  status: HRMasterStatus;
  type: HRMasterType;
}

const HRMasterSchema: Schema<IHRMaster> = new Schema(
  {
    name: { type: String, required: true, trim: true },
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
      index: true,
    },
  },
  { timestamps: true },
);

HRMasterSchema.index({ type: 1, name: 1 }, { unique: true });

const HRMaster: Model<IHRMaster> = mongoose.model<IHRMaster>(
  "HRMaster",
  HRMasterSchema,
);

export default HRMaster;
