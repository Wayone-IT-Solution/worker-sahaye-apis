import mongoose, { Document, Schema, Model } from "mongoose";

export enum TradeStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export interface ITrade extends Document {
  name: string;
  description?: string;
  status: TradeStatus;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TradeSchema: Schema<ITrade> = new Schema(
  {
    description: { type: String, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      default: TradeStatus.ACTIVE,
      enum: Object.values(TradeStatus),
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

TradeSchema.index({ status: 1 });

const Trade: Model<ITrade> = mongoose.model<ITrade>(
  "Trade",
  TradeSchema
);

export default Trade;
