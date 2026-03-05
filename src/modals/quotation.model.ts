import { Promotion } from "./promotion.model";
import { BulkHiringRequest } from "./bulkhiring.model";
import { JobRequirement } from "./jobrequirement.model";
import { VirtualHRRequest } from "./virtualhrrequest.model";
import { VirtualHrRecruiter } from "./virtualhrecruiter.model";
import { UnifiedServiceRequest } from "./unifiedrequest.model";
import { ProjectBasedHiring } from "./projectbasedhiring.model";
import mongoose, { Schema, Document, Types, model } from "mongoose";

export enum RequestModelType {
  PROMOTION = "Promotion",
  BULK = "BulkHiringRequest",
  ONDEMAND = "JobRequirement",
  VirtualHR = "VirtualHRRequest",
  PROJECT = "ProjectBasedHiring",
  SUPPORT = "UnifiedServiceRequest",
  VIRTUAL_HR_RECRUITER = "VirtualHrRecruiter",
}

export const modelMap: Record<string, mongoose.Model<any>> = {
  JobRequirement: JobRequirement,
  VirtualHRRequest: VirtualHRRequest,
  BulkHiringRequest: BulkHiringRequest,
  ProjectBasedHiring: ProjectBasedHiring,
  UnifiedServiceRequest: UnifiedServiceRequest,
  VirtualHrRecruiter: VirtualHrRecruiter,
  Promotion: Promotion,
};

export function getModelFromType(model: RequestModelType) {
  switch (model) {
    case RequestModelType.BULK:
      return BulkHiringRequest;
    case RequestModelType.ONDEMAND:
      return JobRequirement;
    case RequestModelType.VirtualHR:
      return VirtualHRRequest;
    case RequestModelType.PROJECT:
      return ProjectBasedHiring;
    case RequestModelType.SUPPORT:
      return UnifiedServiceRequest;
    case RequestModelType.VIRTUAL_HR_RECRUITER:
      return VirtualHrRecruiter;
    case RequestModelType.PROMOTION:
      return Promotion;
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

interface IUserQuotationResponse {
  comment?: string;
  respondedAt?: Date;
  respondedBy?: Types.ObjectId;
  decision: "accepted" | "declined";
}

interface IQuotationActivity {
  action: "created" | "updated" | "accepted" | "declined";
  actorRole: "admin" | "employer" | "contractor" | "worker" | "agent" | "system";
  actorId?: Types.ObjectId;
  status: QuotationStatus;
  comment?: string;
  snapshot: Record<string, any>;
  createdAt?: Date;
}

export interface IQuotation extends Document {
  notes: INote[];
  amount: number;
  gstType?: "intra_state" | "inter_state";
  gstRate?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalTaxAmount?: number;
  totalAmountWithTax?: number;
  createdAt: Date;
  updatedAt: Date;
  paymentDate?: Date;
  advanceAmount?: number;
  userId: Types.ObjectId;
  agentId?: Types.ObjectId;
  quotationDocument?: string;
  isAdvancePaid?: boolean;
  status: QuotationStatus;
  requestId: Types.ObjectId;
  requestModel: RequestModelType;
  userResponse?: IUserQuotationResponse;
  activityTimeline?: IQuotationActivity[];
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
  { _id: false },
);

const UserResponseSchema = new Schema<IUserQuotationResponse>(
  {
    decision: {
      type: String,
      enum: ["accepted", "declined"],
      required: true,
    },
    comment: { type: String, trim: true },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    respondedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const QuotationActivitySchema = new Schema<IQuotationActivity>(
  {
    action: {
      type: String,
      enum: ["created", "updated", "accepted", "declined"],
      required: true,
    },
    actorRole: {
      type: String,
      enum: ["admin", "employer", "contractor", "worker", "agent", "system"],
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    status: {
      type: String,
      enum: Object.values(QuotationStatus),
      required: true,
    },
    comment: { type: String, trim: true },
    snapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
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
    gstType: {
      type: String,
      enum: ["intra_state", "inter_state"],
      default: "intra_state",
    },
    gstRate: { type: Number, default: 0 },
    cgstRate: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    igstRate: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalTaxAmount: { type: Number, default: 0 },
    totalAmountWithTax: { type: Number, default: 0 },
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
      required: false,
      ref: "Salesperson",
      type: Schema.Types.ObjectId,
    },
    quotationDocument: {
      type: String,
      trim: true,
    },
    userResponse: {
      type: UserResponseSchema,
    },
    notes: {
      default: [],
      type: [NoteSchema],
    },
    activityTimeline: {
      default: [],
      type: [QuotationActivitySchema],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Quotation = model<IQuotation>("Quotation", QuotationSchema);
