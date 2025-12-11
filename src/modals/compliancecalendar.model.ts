import mongoose, { Schema, Document, Types } from "mongoose";

export enum ComplianceEventType {
  PF = "PF Return",
  OTHER = "Other",
  GST = "GST Return",
  ESI = "ESI Filing",
  HOLIDAY = "Holiday",
  GENERAL = "General",
  POLICY_UPDATE = "Policy Update",
}

export enum RecurrencePattern {
  NONE = "None",
  DAILY = "Daily",
  WEEKLY = "Weekly",
  YEARLY = "Yearly",
  MONTHLY = "Monthly",
  QUARTERLY = "Quarterly",
}

export interface IComplianceCalendar extends Document {
  title: string;
  notes: string;
  eventDate: Date;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  document?: string;
  customLabel?: string;
  recurrence: RecurrencePattern;
  eventType: ComplianceEventType;
}

const ComplianceCalendarSchema = new Schema<IComplianceCalendar>(
  {
    title: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },
    notes: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    eventType: {
      type: String,
      enum: Object.values(ComplianceEventType),
      default: ComplianceEventType.GENERAL,
      index: true,
    },
    customLabel: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    eventDate: {
      type: Date,
      required: true,
      index: true,
    },
    recurrence: {
      type: String,
      enum: Object.values(RecurrencePattern),
      default: RecurrencePattern.NONE,
    },
    document: {
      type: String,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

ComplianceCalendarSchema.index({ tags: 1 });

export const ComplianceCalendar = mongoose.model<IComplianceCalendar>(
  "ComplianceCalendar",
  ComplianceCalendarSchema
);
