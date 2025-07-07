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
  type: CourseType;
  startDate?: Date;
  imageUrl?: string;
  _id: Types.ObjectId;
  description?: string;
  status: CourseStatus;
  priority: PriorityLevel;
  category: Schema.Types.ObjectId;
  locationDetails?: {
    address?: string;
    locationName?: string;
    contactEmail?: string;
    contactPhone?: string;
    meetingDates?: Date[];
  };

  calculateProgress(): Promise<number>;
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
const CourseSchema = new Schema<ICourse>(
  {
    imageUrl: String,
    description: String,
    name: { type: String, required: true },
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
      defualt: CourseType.ONLINE,
      enum: Object.values(CourseType),
    },
    endDate: Date,
    tags: [String],
    startDate: Date,
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
    locationDetails: {
      address: { type: String },
      locationName: { type: String },
      contactEmail: { type: String },
      contactPhone: { type: String },
      meetingDates: [{ type: Date }],
    },
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
  if (
    this.type === CourseType.OFFLINE &&
    (!this.locationDetails || !this.locationDetails.address)
  ) {
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
