import mongoose, { Schema, Document, Types } from "mongoose";

export interface IForumComment extends Document {
  content: string;
  createdAt: Date;
  updatedAt: Date;
  post: Types.ObjectId;
  user: Types.ObjectId;
  repliesCount: number;
}

const ForumCommentSchema = new Schema<IForumComment>(
  {
    post: {
      index: true,
      required: true,
      ref: "ForumPost",
      type: Schema.Types.ObjectId,
    },
    user: {
      ref: "User",
      index: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    repliesCount: { type: Number, default: 0 },
    content: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: true }
);

ForumCommentSchema.index({ content: "text" });

export const ForumComment = mongoose.model<IForumComment>(
  "ForumComment",
  ForumCommentSchema
);
