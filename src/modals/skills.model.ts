import mongoose, { Document, Schema, Model } from "mongoose";

export enum SkillsStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export interface ISkills extends Document {
  name: string;
  order: number;
  description?: string;
  status: SkillsStatus;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SkillsSchema: Schema<ISkills> = new Schema(
  {
    description: { type: String, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    order: { type: Number, default: 0, index: true },
    status: {
      type: String,
      default: SkillsStatus.ACTIVE,
      enum: Object.values(SkillsStatus),
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

SkillsSchema.index({ status: 1 });
SkillsSchema.index({ order: 1, name: 1 });

const Skills: Model<ISkills> = mongoose.model<ISkills>("Skills", SkillsSchema);

export default Skills;
