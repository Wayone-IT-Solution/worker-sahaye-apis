import mongoose, { Schema, Document, Types } from "mongoose";

export enum ReminderType {
  BEFORE_7_DAYS = "BEFORE_7_DAYS",
  BEFORE_1_DAY = "BEFORE_1_DAY",
  ON_DUE_DATE = "ON_DUE_DATE",
}

export enum ReminderChannel {
  IN_APP = "IN_APP",
  WHATSAPP = "WHATSAPP",
  EMAIL = "EMAIL",
}

export enum ReminderStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

export interface IComplianceCalendarReminder extends Document {
  complianceCalendarStatusId: Types.ObjectId;
  complianceCalendarId: Types.ObjectId;
  employerId: Types.ObjectId;
  reminderType: ReminderType;
  channels: ReminderChannel[];
  status: ReminderStatus;
  scheduledFor: Date; // When reminder should be sent
  sentAt?: Date;
  failureReason?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceCalendarReminderSchema = new Schema<IComplianceCalendarReminder>(
  {
    complianceCalendarStatusId: {
      type: Schema.Types.ObjectId,
      ref: "ComplianceCalendarStatus",
      required: true,
      index: true,
    },
    complianceCalendarId: {
      type: Schema.Types.ObjectId,
      ref: "ComplianceCalendar",
      required: true,
      index: true,
    },
    employerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reminderType: {
      type: String,
      enum: Object.values(ReminderType),
      required: true,
      index: true,
    },
    channels: [
      {
        type: String,
        enum: Object.values(ReminderChannel),
      },
    ],
    status: {
      type: String,
      enum: Object.values(ReminderStatus),
      default: ReminderStatus.PENDING,
      index: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },
    sentAt: {
      type: Date,
      sparse: true,
    },
    failureReason: {
      type: String,
      maxlength: 500,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Index for finding pending reminders to send
ComplianceCalendarReminderSchema.index({
  status: 1,
  scheduledFor: 1,
});

// Index for user's reminders
ComplianceCalendarReminderSchema.index({
  employerId: 1,
  createdAt: -1,
});

export const ComplianceCalendarReminder = mongoose.model<IComplianceCalendarReminder>(
  "ComplianceCalendarReminder",
  ComplianceCalendarReminderSchema
);
