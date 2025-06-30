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

export const GratuityRecord = mongoose.model<IGratuityRecord>(
  "GratuityRecord",
  GratuityRecordSchema
);
