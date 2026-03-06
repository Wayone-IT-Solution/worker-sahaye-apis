import mongoose, { Schema, Document, Types } from "mongoose";


export enum UnifiedRequestStatus {
  PENDING = "Pending",
  ASSIGNED = "Assigned",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
  IN_PROGRESS = "In Progress",
}

export interface IUnifiedServiceRequest extends Document {
  email: string;
  field: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  assignedAt?: Date;
  document?: string;
  completedAt?: Date;
  companyName: string;
  mobileNumber: string;
  contactPerson: string;
  userId: Types.ObjectId;

  salesPersonAt?: Date;
  salesPersonTo?: Types.ObjectId;

  preferredDateTime: Date;
  exclusiveService: string;
  briefDescription: string;
  additionalNotes?: string;
  numberOfEmployees: number;
  assignedBy?: Types.ObjectId;
  cancellationReason?: string;
  assignedTo?: Types.ObjectId;
  status: UnifiedRequestStatus;
  location: { state: string; city: string };
  preferredCommunicationMode: string;
}

const UnifiedServiceRequestSchema = new Schema<IUnifiedServiceRequest>(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/.+@.+\..+/, "Invalid email format"],
    },
    exclusiveService: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },
    briefDescription: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    field: {
      type: String,
      required: false,
      maxlength: 100,
    },
    preferredCommunicationMode: {
      type: String,
      default: "Email",
      required: false,
    },
    preferredDateTime: {
      type: Date,
      required: true,
    },
    location: {
      state: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
    },
    numberOfEmployees: {
      type: Number,
      required: false,
      min: 1,
    },
    additionalNotes: {
      type: String,
      maxlength: 1000,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    salesPersonTo: {
      type: Schema.Types.ObjectId,
      ref: "Salesperson",
    },
    salesPersonAt: {
      type: Date,
    },
    document: { type: String },
    assignedAt: { type: Date },
    completedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    cancellationReason: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: Object.values(UnifiedRequestStatus),
      default: UnifiedRequestStatus.PENDING,
      index: true,
    },
  },
  { timestamps: true }
);

UnifiedServiceRequestSchema.index({ email: 1 });
UnifiedServiceRequestSchema.index({ "location.state": 1, "location.city": 1 });
UnifiedServiceRequestSchema.index({ preferredDateTime: 1 });

export const UnifiedServiceRequest = mongoose.model<IUnifiedServiceRequest>(
  "UnifiedServiceRequest",
  UnifiedServiceRequestSchema
);
