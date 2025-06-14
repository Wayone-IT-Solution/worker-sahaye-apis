import mongoose, { Schema, Document, Types } from "mongoose";

export type UserRole = "passenger" | "driver";
export type NotificationType =
  | "trip-requested"
  | "trip-accepted"
  | "trip-started"
  | "trip-rejected"
  | "driver-reached"
  | "trip-cancelled"
  | "trip-completed";
export interface INotification extends Document {
  title: string;
  message: string;
  type: NotificationType;
  from?: {
    user: Types.ObjectId;
    role: UserRole;
  };
  to: {
    user: Types.ObjectId;
    role: UserRole;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "trip-requested",
        "trip-accepted",
        "trip-started",
        "trip-rejected",
        "driver-reached",
        "trip-cancelled",
        "trip-completed",
      ],
      required: true,
    },
    from: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "from.role",
      },
      role: {
        type: String,
        enum: ["passenger", "driver"],
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
        required: true,
        enum: ["passenger", "driver"],
      },
    },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
