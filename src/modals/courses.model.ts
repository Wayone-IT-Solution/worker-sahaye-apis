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

// Methods
// CourseSchema.methods.calculateProgress = async function () {
//   const Lesson = mongoose.model<ILesson>("Lesson");
//   const lessons = await Lesson.find({ course: this._id });
//   const total = lessons.length;
//   if (total === 0) {
//     this.progress = 0;
//     await this.save();
//     return 0;
//   }

//   const completedLessons = await Promise.all(
//     lessons.map(async (lesson) => {
//       const count = await TimeEntry.countDocuments({
//         lesson: lesson._id,
//         course: this._id,
//       });
//       return count > 0 ? 1 : 0; // mark as completed if user has logged time
//     })
//   );

//   const completed = completedLessons.reduce((sum, val): any => sum + val, 0);
//   const progress = Math.round((completed / total) * 100);

//   this.progress = progress;
//   await this.save();
//   return progress;
// };

// Indexes
CourseSchema.index({ tags: 1 });
CourseSchema.index({ enrolledUsers: 1 });
LessonSchema.index({ course: 1, order: 1 });
CourseSchema.index({ createdBy: 1, status: 1 });
// Exports
export const Lesson = mongoose.model<ILesson>("Lesson", LessonSchema);
export const Course = mongoose.model<ICourse>("Course", CourseSchema);
