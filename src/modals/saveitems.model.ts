import { Schema, model, Document, Types } from "mongoose";

/**
 * SaveType: What is being saved
 */
export enum SaveType {
  PROFILE = "profile",
  JOB = "job",
  DRAFT = "draft",
}

/**
 * ReferenceType: What type of entity is being saved
 */
export enum ReferenceType {
  USER = "user",
  JOB = "job",
  JOBDRAFT = "jobdraft",
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
  saveType: SaveType;
  referenceId: Types.ObjectId;
  referenceType: ReferenceType;
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
    saveType: {
      type: String,
      enum: Object.values(SaveType),
      required: true,
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    referenceType: {
      type: String,
      enum: Object.values(ReferenceType),
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
SaveItemSchema.index({ user: 1, referenceType: 1 });
SaveItemSchema.index(
  { user: 1, referenceId: 1, referenceType: 1 },
  { unique: true, sparse: true },
);
SaveItemSchema.index({ referenceId: 1, referenceType: 1 });
SaveItemSchema.index({ user: 1, saveType: 1 });

/**
 * Check if user already saved an item
 */
SaveItemSchema.statics.isSaved = async function (
  userId: string,
  referenceId: string,
  referenceType: ReferenceType,
) {
  const saveItem = await this.findOne({
    user: new (this as any).db.Types.ObjectId(userId),
    referenceId: new (this as any).db.Types.ObjectId(referenceId),
    referenceType,
  });
  return !!saveItem;
};

/**
 * Count saves by type for a user (for limit checking)
 */
SaveItemSchema.statics.countSavesByType = async function (
  userId: string,
  saveType: SaveType,
) {
  return this.countDocuments({
    user: new (this as any).db.Types.ObjectId(userId),
    saveType,
  });
};

export const SaveItem = model<ISaveItem>("SaveItem", SaveItemSchema);
