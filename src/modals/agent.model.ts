import mongoose, { Document, Schema, Model } from "mongoose";

export interface IAgent extends Document {
  name: string;
  bio?: string;
  email: string;
  mobile?: string;
  skills: string[];
  createdAt?: Date;
  updatedAt?: Date;
  location?: string;
  department?: string;
  availability: boolean;
  activeTickets: number;
  resolvedTickets: number;
  profilePictureUrl?: string;
}

const AgentSchema: Schema<IAgent> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    mobile: {
      type: String,
      match: /^[6-9]\d{9}$/, // Indian format
    },
    department: {
      type: String,
      trim: true,
    },
    profilePictureUrl: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: 1000,
    },
    location: {
      type: String,
      trim: true,
    },
    availability: {
      type: Boolean,
      default: true,
    },
    activeTickets: {
      type: Number,
      default: 0,
    },
    resolvedTickets: {
      type: Number,
      default: 0,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

const Agent: Model<IAgent> = mongoose.model<IAgent>("Agent", AgentSchema);

export default Agent;
