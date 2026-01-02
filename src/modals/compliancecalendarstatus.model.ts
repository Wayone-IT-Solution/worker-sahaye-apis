import mongoose, { Schema, Document, Types } from "mongoose";

export enum ComplianceStatus {
  UPCOMING = "UPCOMING",
  YET_TO_PAY = "YET_TO_PAY",
  PAID = "PAID",
  MISSED = "MISSED",
}

export interface IComplianceCalendarStatus extends Document {
  complianceCalendarId: Types.ObjectId;
  employerId: Types.ObjectId;
  status: ComplianceStatus;
  datePaid?: Date;
  notes?: string;
  attachments?: string[]; // URLs to documents proving payment
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId; // Employee/Admin who created
  updatedBy: Types.ObjectId; // Last updated by
}

const ComplianceCalendarStatusSchema = new Schema<IComplianceCalendarStatus>(
  {
    complianceCalendarId: {
      type: Schema.Types.ObjectId,
      ref: "ComplianceCalendar",
      required: true,
      index: true,
    },
    employerId: {
      type: Schema.Types.ObjectId,
      ref: "User", // Assuming User model exists
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ComplianceStatus),
      default: ComplianceStatus.UPCOMING,
      index: true,
    },
    datePaid: {
      type: Date,
      sparse: true, // Optional, only when status is PAID
    },
    notes: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    attachments: [
      {
        type: String, // S3 URLs
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index for quick lookups
ComplianceCalendarStatusSchema.index({
  complianceCalendarId: 1,
  employerId: 1,
  createdAt: -1,
});

ComplianceCalendarStatusSchema.index({ employerId: 1, status: 1 });
ComplianceCalendarStatusSchema.index({ complianceCalendarId: 1, status: 1 });

export const ComplianceCalendarStatus = mongoose.model<IComplianceCalendarStatus>(
  "ComplianceCalendarStatus",
  ComplianceCalendarStatusSchema
);
