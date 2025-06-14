import mongoose, { Schema, Document } from "mongoose";

export interface IFareModel extends Document {
  createdAt: Date;
  updatedAt: Date;
  baseFare: number;
  perKmRate: number;
  isActive: boolean;
  distanceTo: number;
  vehicleType: string;
  distanceFrom: number;
}

const FareModelSchema: Schema = new Schema<IFareModel>(
  {
    baseFare: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    perKmRate: { type: Number, required: true },
    distanceTo: { type: Number, required: true },
    vehicleType: { type: String, required: true },
    distanceFrom: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IFareModel>("FareModel", FareModelSchema);
