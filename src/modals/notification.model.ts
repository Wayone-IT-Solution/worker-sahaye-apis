import mongoose, { Schema, Document, Types } from "mongoose";

export enum UserType {
  WORKER = "worker",
  EMPLOYER = "employer",
  CONTRACTOR = "contractor",
}

export type NotificationType =
  | "job-posted"
  | "job-applied"
  | "job-expiring"
  | "course-added"
  | "reply-on-post"
  | "admin-message"
  | "general-alert"
  | "course-enrolled"
  | "new-community-post"
  | "subscription-renewal"
  | "subscription-expiring";

/** Read/Delivery status */
export type NotificationStatus = "unread" | "read" | "deleted";

/** Notification Document Interface */
export interface INotification extends Document {
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  from?: {
    role: UserType;
    user: Types.ObjectId;
  };
  to: {
    role: UserType;
    user: Types.ObjectId;
  };
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Notification Schema */
const NotificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "job-posted",
        "job-applied",
        "job-expiring",
        "course-added",
        "course-enrolled",
        "subscription-renewal",
        "subscription-expiring",
        "new-community-post",
        "reply-on-post",
        "admin-message",
        "general-alert",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["unread", "read", "deleted"],
      default: "unread",
    },
    from: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "from.role",
      },
      role: {
        type: String,
        enum: Object.values(UserType),
      },
    },
    to: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "to.role",
      },
      role: {
        type: String,
        enum: Object.values(UserType),
        required: true,
      },
    },
    readAt: { type: Date },
  },
  { timestamps: true, }
);

NotificationSchema.index({ "to.user": 1, status: 1, createdAt: -1 });
export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
