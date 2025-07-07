import { Schema, model, Document, Types } from "mongoose";

export interface IPostLike extends Document {
  likedAt: Date;
  post: Types.ObjectId;
  likedBy: Types.ObjectId;
}

export interface IPostShare extends Document {
  sharedAt: Date;
  post: Types.ObjectId;
  sharedBy: Types.ObjectId;
  sharedTo: Types.ObjectId;
}

const PostShareSchema = new Schema<IPostShare>(
  {
    post: {
      index: true,
      required: true,
      ref: "ForumPost",
      type: Schema.Types.ObjectId,
    },
    sharedAt: { type: Date, default: Date.now },
    sharedTo: { type: Schema.Types.ObjectId, ref: "User" },
    sharedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const PostLikeSchema = new Schema<IPostLike>(
  {
    post: {
      index: true,
      required: true,
      ref: "ForumPost",
      type: Schema.Types.ObjectId,
    },
    likedBy: {
      ref: "User",
      index: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    likedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// --- Indexes for PostLike ---
PostLikeSchema.index({ post: 1 });                     // For querying likes on a post
PostLikeSchema.index({ likedBy: 1 });                  // For querying likes by a user
PostLikeSchema.index({ post: 1, likedBy: 1 }, { unique: true }); // Prevent duplicate likes

// --- Indexes for PostShare ---
PostShareSchema.index({ post: 1 });                    // For querying shares of a post
PostShareSchema.index({ sharedBy: 1 });                // For querying shares made by a user
PostShareSchema.index({ sharedTo: 1 });                // For querying shares received by a user
PostShareSchema.index(
  { post: 1, sharedBy: 1, sharedTo: 1 },
  { unique: true, sparse: true }
);
PostLikeSchema.index({ post: 1, likedBy: 1 }, { unique: true });

export const PostLike = model<IPostLike>("PostLike", PostLikeSchema);
export const PostShare = model<IPostShare>("PostShare", PostShareSchema);
