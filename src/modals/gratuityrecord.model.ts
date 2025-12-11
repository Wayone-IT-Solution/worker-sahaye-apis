import mongoose, { Schema, Document } from "mongoose";

export interface IGratuityRecord extends Document {
  createdAt: Date;
  updatedAt: Date;
  dateOfExit: Date;
  department: string;
  dateOfJoining: Date;
  designation: string;
  employeeName: string;
  gratuityAmount: number;
  totalYearsOfService: number;
  lastDrawnBasicSalary: number;
  userId: mongoose.Types.ObjectId;
}

const GratuityRecordSchema: Schema = new Schema<IGratuityRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfJoining: {
      type: Date,
      required: true,
    },
    dateOfExit: {
      type: Date,
      required: true,
    },
    lastDrawnBasicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    totalYearsOfService: {
      type: Number,
      required: true,
      min: 0,
    },
    gratuityAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

GratuityRecordSchema.index({ employeeName: 1 });                   // Search/filter by employee name
GratuityRecordSchema.index({ designation: 1 });                    // Filter by designation
GratuityRecordSchema.index({ department: 1 });                     // Filter by department
GratuityRecordSchema.index({ dateOfExit: -1 });                    // Sorting/filtering by exit date (latest first)
GratuityRecordSchema.index({ dateOfJoining: -1 });                 // Sorting/filtering by joining date
GratuityRecordSchema.index({ department: 1, designation: 1 });     // Compound filter (e.g., HR Managers)
GratuityRecordSchema.index({ userId: 1, dateOfExit: -1 });         // For user-based exit date queries
GratuityRecordSchema.index({ employeeName: "text" });              // Full-text search on employee name

export const GratuityRecord = mongoose.model<IGratuityRecord>(
  "GratuityRecord",
  GratuityRecordSchema
);
