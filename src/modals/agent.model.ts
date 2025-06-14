import mongoose, { Document, Schema, Model } from "mongoose";

export interface IAgent extends Document {
  name: string;
  email: string;
  skills: string[];
  createdAt?: Date;
  updatedAt?: Date;
  availability: boolean;
  activeTickets: number;
  resolvedTickets?: number;
  userId: mongoose.Types.ObjectId;
}

const AgentSchema: Schema<IAgent> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
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
  {
    timestamps: true,
  }
);

const Agent: Model<IAgent> = mongoose.model<IAgent>("Agent", AgentSchema);

export default Agent;
