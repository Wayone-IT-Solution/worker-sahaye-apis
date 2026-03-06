import mongoose, { Document, Schema, Types } from "mongoose";

export enum CourseStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  ARCHIVED = "archived",
  COMPLETED = "completed",
}

export enum PriorityLevel {
  LOW = "low",
  HIGH = "high",
  MEDIUM = "medium",
  CRITICAL = "critical",
}

export enum CourseType {
  ONLINE = "online",
  OFFLINE = "offline",
}

export enum TimeEntryStatus {
  COMPLETED = "completed",
  IN_PROGRESS = "in_progress",
  NOT_STARTED = "not_started",
}

export interface ILesson extends Document {
  title: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  videoUrl?: string;
  _id: Types.ObjectId;
  description?: string;
  estimatedTime: number;
  course: Types.ObjectId;
}

export interface ITimeEntry extends Document {
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  timeSpent?: number;
  completedAt?: Date;
  user: Types.ObjectId;
  course: Types.ObjectId;
  lesson: Types.ObjectId;
  status: TimeEntryStatus;
}

export interface ICourse extends Document {
  name: string;
  endDate?: Date;
  tags: string[];
  amount: number;
  createdAt: Date;
  updatedAt: Date;
  isFree: boolean;
  extras: string[];
  type: string;
  startDate?: Date;
  imageUrl?: string;
  _id: Types.ObjectId;
  certificate?: string;
  description?: string;
  status: CourseStatus;
  priority: PriorityLevel;
  discountedAmount: number;
  category: Schema.Types.ObjectId;
  classSchedule?: ICourseSession[];
  address?: string;
  locationName?: string;
  contactEmail?: string;
  contactPhone?: string;
  calculateProgress(): Promise<number>;
}

export interface ICourseSession {
  date: Date;
  hours: number;
  mode: CourseType;
  endTime?: string;
  note?: string;
  isActive?: boolean;
  startTime?: string;
  maxStudents?: number;
  meetingLink?: string;
  locationName?: string;
  locationAddress?: string;
}

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    status: {
      type: String,
      enum: Object.values(TimeEntryStatus),
      default: TimeEntryStatus.NOT_STARTED,
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    timeSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Lesson Schema
const LessonSchema = new Schema<ILesson>(
  {
    videoUrl: String,
    description: String,
    title: { type: String, required: true },
    order: { type: Number, required: true },
    estimatedTime: { type: Number, required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  },
  { timestamps: true }
);

// Course Schema
const CourseSessionSchema = new Schema<ICourseSession>(
  {
    date: { type: Date, required: true },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    hours: { type: Number, required: true, min: 1 },
    maxStudents: { type: Number, min: 1 },
    mode: {
      type: String,
      default: CourseType.ONLINE,
      enum: Object.values(CourseType),
    },
    meetingLink: { type: String, trim: true },
    locationName: { type: String, trim: true },
    locationAddress: { type: String, trim: true },
    note: { type: String, trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const CourseSchema = new Schema<ICourse>(
  {
    imageUrl: String,
    description: String,
    name: { type: String, required: true },
    certificate: { type: String },
    status: {
      type: String,
      default: CourseStatus.DRAFT,
      enum: Object.values(CourseStatus),
    },
    priority: {
      type: String,
      default: PriorityLevel.MEDIUM,
      enum: Object.values(PriorityLevel),
    },
    type: {
      type: String,
      default: CourseType.ONLINE,
      required: true,
      validate: {
        validator: (value: string) => {
          const normalized = String(value || "")
            .split(",")
            .map((entry) => entry.trim().toLowerCase())
            .filter(Boolean);
          if (!normalized.length) return false;
          return normalized.every((entry) =>
            Object.values(CourseType).includes(entry as CourseType),
          );
        },
        message:
          "Course type must contain valid values: online/offline (comma separated).",
      },
    },
    endDate: Date,
    tags: [String],
    extras: [String],
    startDate: Date,
    classSchedule: {
      type: [CourseSessionSchema],
      default: [],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "WorkerCategory",
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    amount: {
      type: Number,
      required: true,
    },
    discountedAmount: {
      type: Number,
      required: true,
    },
    address: { type: String },
    locationName: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
CourseSchema.virtual("lessons", {
  ref: "Lesson",
  localField: "_id",
  foreignField: "course",
});

CourseSchema.pre("validate", function (next) {
  if (typeof this.type === "string") {
    const normalizedType = this.type
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => Object.values(CourseType).includes(entry as CourseType));
    const uniqueType = Array.from(new Set(normalizedType));
    if (!uniqueType.length) {
      return next(new Error("Course type is required"));
    }
    this.type = uniqueType.join(",");
  }

  const normalizedSchedule = Array.isArray(this.classSchedule)
    ? this.classSchedule.filter((session: any) => session && session.date)
    : [];

  this.classSchedule = normalizedSchedule as any;

  if (normalizedSchedule.length > 0) {
    const sessionDates: Date[] = [];

    for (const session of normalizedSchedule as any[]) {
      const sessionDate = new Date(session.date);
      if (Number.isNaN(sessionDate.getTime())) {
        return next(new Error("Invalid class schedule date provided."));
      }
      sessionDates.push(sessionDate);

      const mode = String(session.mode || "")
        .trim()
        .toLowerCase();

      if (mode === CourseType.ONLINE) {
        if (!String(session.meetingLink || "").trim()) {
          return next(
            new Error("Online class schedule requires meetingLink.")
          );
        }
      }

      if (mode === CourseType.OFFLINE) {
        const hasOfflineLocation =
          String(session.locationAddress || "").trim() ||
          String(session.locationName || "").trim();
        if (!hasOfflineLocation) {
          return next(
            new Error(
              "Offline class schedule requires locationName or locationAddress."
            )
          );
        }
      }
    }

    const startTime = Math.min(...sessionDates.map((date) => date.getTime()));
    const endTime = Math.max(...sessionDates.map((date) => date.getTime()));
    this.startDate = new Date(startTime);
    this.endDate = new Date(endTime);
  }

  if (this.startDate && this.endDate) {
    const startTime = new Date(this.startDate).getTime();
    const endTime = new Date(this.endDate).getTime();
    if (startTime > endTime) {
      return next(new Error("Course endDate must be after startDate."));
    }
  }

  const hasOfflineType = this.type
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .includes(CourseType.OFFLINE);

  const hasOfflineScheduleLocation = normalizedSchedule.some((session: any) => {
    const mode = String(session?.mode || "")
      .trim()
      .toLowerCase();
    if (mode !== CourseType.OFFLINE) return false;
    return (
      String(session?.locationAddress || "").trim() ||
      String(session?.locationName || "").trim()
    );
  });

  if (hasOfflineType && !this.address && !hasOfflineScheduleLocation) {
    return next(
      new Error("Offline courses must include location details with address.")
    );
  }
  next();
});

// Course indexes
CourseSchema.index({ tags: 1 });
CourseSchema.index({ createdBy: 1, status: 1 });
CourseSchema.index({ category: 1, status: 1 });
CourseSchema.index({ type: 1, status: 1 });
CourseSchema.index({ isFree: 1, amount: 1 });
CourseSchema.index({ startDate: -1 });
CourseSchema.index({ priority: 1 });
CourseSchema.index({ name: "text", description: "text" });

// Lesson indexes
LessonSchema.index({ course: 1, order: 1 });
LessonSchema.index({ title: "text" });

// TimeEntry indexes
TimeEntrySchema.index({ user: 1, course: 1, lesson: 1 }, { unique: true });
TimeEntrySchema.index({ course: 1, lesson: 1 });
TimeEntrySchema.index({ user: 1, status: 1 });

export const Lesson = mongoose.model<ILesson>("Lesson", LessonSchema);
export const Course = mongoose.model<ICourse>("Course", CourseSchema);
export const TimeEntry = mongoose.model<ITimeEntry>(
  "TimeEntry",
  TimeEntrySchema
);
