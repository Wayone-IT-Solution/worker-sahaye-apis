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

PostLikeSchema.index({ post: 1, likedBy: 1 }, { unique: true });

export const PostLike = model<IPostLike>("PostLike", PostLikeSchema);
export const PostShare = model<IPostShare>("PostShare", PostShareSchema);
