import mongoose, { Schema, Document, Types } from "mongoose";

export enum CommunicationMode {
  EMAIL = "Email",
  PHONE = "Phone",
  OTHER = "Other",
  WHATSAPP = "WhatsApp",
}

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
  preferredCommunicationMode: CommunicationMode;
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
      match: [
        /^\+91\d{10}$/,
        "Invalid Indian mobile number format (+91XXXXXXXXXX)",
      ],
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
      required: true,
      maxlength: 100,
    },
    preferredCommunicationMode: {
      type: String,
      enum: Object.values(CommunicationMode),
      default: CommunicationMode.EMAIL,
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
      required: true,
      min: 1,
    },
    additionalNotes: {
      type: String,
      maxlength: 1000,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "VirtualHR",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
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
