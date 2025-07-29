import mongoose, { Schema, Document, Types, model } from "mongoose";

/** TimeSlot Interface */
export interface ITimeSlot {
  date: Date;
  endTime: string;
  duration?: string;
  startTime: string;
  isBooked?: boolean;
  bookedBy?: Types.ObjectId | null;
}

/** Slot Interface */
export interface ISlot extends Document {
  user: Types.ObjectId;
  timeslots: ITimeSlot[];
}

/** TimeSlot Schema */
const TimeSlotSchema = new Schema<ITimeSlot>(
  {
    date: {
      type: Date,
      required: true,
    },
    duration: {
      type: String,
      default: "30",
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
    bookedBy: {
      ref: "User",
      default: null,
      type: Schema.Types.ObjectId,
    },
  },
);

/** Slot Schema */
const SlotSchema = new Schema<ISlot>(
  {
    user: {
      unique: true,
      required: true,
      ref: "PersonalAssistant",
      type: Schema.Types.ObjectId,
    },
    timeslots: {
      type: [TimeSlotSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Export models
export const Slot = model<ISlot>("Slot", SlotSchema);
export const TimeSlot = model<ITimeSlot>("TimeSlot", TimeSlotSchema);
