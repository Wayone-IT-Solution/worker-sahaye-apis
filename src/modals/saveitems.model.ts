import { Schema, model, Document, Types } from "mongoose";

/**
 * SaveItemType: What is being saved (Job, Profile, or Draft)
 */
export enum SaveItemType {
  JOB = "job",
  PROFILE = "profile",
  DRAFT = "draft",
}

/**
 * SavedByType: Who is saving
 */
export enum SavedByType {
  WORKER = "worker",
  EMPLOYER = "employer",
  CONTRACTOR = "contractor",
}

/**
 * ISaveItem Interface
 */
export interface ISaveItem extends Document {
  user: Types.ObjectId;
  savedBy: SavedByType;
  type: SaveItemType;
  referenceId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SaveItem Schema
 */
const SaveItemSchema = new Schema<ISaveItem>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    savedBy: {
      type: String,
      enum: Object.values(SavedByType),
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(SaveItemType),
      required: true,
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

/**
 * Indexes
 */
SaveItemSchema.index({ user: 1, createdAt: -1 });
SaveItemSchema.index({ user: 1, type: 1 });
SaveItemSchema.index(
  { user: 1, referenceId: 1, type: 1 },
  { unique: true, sparse: true },
);
SaveItemSchema.index({ referenceId: 1, type: 1 });

/**
 * Check if user already saved an item
 */
SaveItemSchema.statics.isSaved = async function (
  userId: string,
  referenceId: string,
  type: SaveItemType,
) {
  const saveItem = await this.findOne({
    user: new (this as any).db.Types.ObjectId(userId),
    referenceId: new (this as any).db.Types.ObjectId(referenceId),
    type,
  });
  return !!saveItem;
};

/**
 * Count saves by type for a user (for limit checking)
 */
SaveItemSchema.statics.countSavesByType = async function (
  userId: string,
  type: SaveItemType,
) {
  return this.countDocuments({
    user: new (this as any).db.Types.ObjectId(userId),
    type,
  });
};

export const SaveItem = model<ISaveItem>("SaveItem", SaveItemSchema);
