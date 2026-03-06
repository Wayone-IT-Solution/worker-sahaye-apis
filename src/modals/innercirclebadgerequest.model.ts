import mongoose, { Schema, Document, Types } from "mongoose";

export enum InnerCircleBadgeRequestStatus {
  PENDING = "pending",
  REQUESTED = "requested",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IInnerCircleBadgeRequest extends Document {
  userId: Types.ObjectId;
  badgeId: Types.ObjectId; // References the existing Badge document
  status: InnerCircleBadgeRequestStatus;
  price?: number;
  duration?: string; // e.g., "3 months", "1 year"
  userInfo: {
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  rejectionReason?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InnerCircleBadgeRequestSchema = new Schema<IInnerCircleBadgeRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    badgeId: {
      type: Schema.Types.ObjectId,
      ref: "Badge",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(InnerCircleBadgeRequestStatus),
      default: InnerCircleBadgeRequestStatus.PENDING,
      index: true,
    },
    price: {
      type: Number,
      min: 0,
    },
    duration: {
      type: String,
      trim: true,
    },
    userInfo: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      avatar: {
        type: String,
        trim: true,
      },
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
InnerCircleBadgeRequestSchema.index({ userId: 1, createdAt: -1 });
InnerCircleBadgeRequestSchema.index({ badgeId: 1, status: 1 });
InnerCircleBadgeRequestSchema.index({ status: 1, createdAt: -1 });

// Pre-save hook to auto-populate timestamps
InnerCircleBadgeRequestSchema.pre("save", function (next) {
  const doc = this as IInnerCircleBadgeRequest;
  if (doc.isModified("status")) {
    if (doc.status === InnerCircleBadgeRequestStatus.APPROVED) {
      doc.approvedAt = new Date();
    } else if (doc.status === InnerCircleBadgeRequestStatus.REJECTED) {
      doc.rejectedAt = new Date();
    }
  }
  next();
});

export const InnerCircleBadgeRequest = mongoose.model<IInnerCircleBadgeRequest>(
  "InnerCircleBadgeRequest",
  InnerCircleBadgeRequestSchema
);
