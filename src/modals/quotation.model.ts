import { VirtualHR } from "./virtualhr.model";
import { BulkHiringRequest } from "./bulkhiring.model";
import { JobRequirement } from "./jobrequirement.model";
import { VirtualHRRequest } from "./virtualhrrequest.model";
import { UnifiedServiceRequest } from "./unifiedrequest.model";
import { ProjectBasedHiring } from "./projectbasedhiring.model";
import mongoose, { Schema, Document, Types, model } from "mongoose";

export enum RequestModelType {
  BULK = "BulkHiringRequest",
  ONDEMAND = "JobRequirement",
  VirtualHR = "VirtualHRRequest",
  PROJECT = "ProjectBasedHiring",
  SUPPORT = "UnifiedServiceRequest",
}

export const modelMap: Record<string, mongoose.Model<any>> = {
  JobRequirement: JobRequirement,
  VirtualHRRequest: VirtualHRRequest,
  BulkHiringRequest: BulkHiringRequest,
  ProjectBasedHiring: ProjectBasedHiring,
  UnifiedServiceRequest: UnifiedServiceRequest,
};

export function getModelFromType(model: RequestModelType) {
  switch (model) {
    case RequestModelType.BULK:
      return BulkHiringRequest;
    case RequestModelType.ONDEMAND:
      return JobRequirement;
    case RequestModelType.VirtualHR:
      return VirtualHR;
    case RequestModelType.PROJECT:
      return ProjectBasedHiring;
    case RequestModelType.SUPPORT:
      return UnifiedServiceRequest;
    default:
      return null;
  }
}

export enum QuotationStatus {
  APPROVED = "approved",
  REJECTED = "rejected",
  COMPLETED = "completed",
  UNDER_REVIEW = "under_review",
}

interface INote {
  text: string;
  createdAt?: Date;
  status: QuotationStatus;
}

export interface IQuotation extends Document {
  notes: INote[];
  amount: number;
  createdAt: Date;
  updatedAt: Date;
  paymentDate?: Date;
  advanceAmount?: number;
  userId: Types.ObjectId;
  agentId: Types.ObjectId;
  isAdvancePaid?: boolean;
  status: QuotationStatus;
  requestId: Types.ObjectId;
  requestModel: RequestModelType;
  paymentMode?: "cash" | "upi" | "bank_transfer" | "card";
}

const NoteSchema = new Schema<INote>(
  {
    text: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(QuotationStatus),
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ---------- MAIN SCHEMA ---------- */
const QuotationSchema = new Schema<IQuotation>(
  {
    requestId: {
      required: true,
      refPath: "requestModel",
      type: Schema.Types.ObjectId,
    },
    requestModel: {
      type: String,
      required: true,
      enum: Object.values(RequestModelType),
    },
    status: {
      type: String,
      default: QuotationStatus.UNDER_REVIEW,
      enum: Object.values(QuotationStatus),
    },
    amount: { type: Number, required: true },
    isAdvancePaid: { type: Boolean, default: false },
    advanceAmount: { type: Number },
    paymentMode: {
      type: String,
      default: "upi",
      enum: ["cash", "upi", "bank_transfer", "card"],
    },
    paymentDate: { type: Date },
    userId: {
      ref: "User",
      required: true,
      type: Schema.Types.ObjectId,
    },
    agentId: {
      required: true,
      ref: "Salesperson",
      type: Schema.Types.ObjectId,
    },
    notes: {
      default: [],
      type: [NoteSchema],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Quotation = model<IQuotation>("Quotation", QuotationSchema);
