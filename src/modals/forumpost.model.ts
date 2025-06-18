import mongoose, { Schema, Document, Types } from "mongoose";

export type ForumPostStatus = "active" | "archived";

export interface IAttachment {
  url: string;
  s3Key: string;
  order: number;
}

export interface IForumPost extends Document {
  title: string;
  likes: number;
  shares: number;
  content: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  commentsCount: number;
  status: ForumPostStatus;
  createdBy: Types.ObjectId;
  community: Types.ObjectId;
  attachments?: IAttachment[];
}

const ForumPostSchema = new Schema<IForumPost>(
  {
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    content: { type: String, required: true, maxlength: 1000 },
    title: { type: String, trim: true, required: true, maxlength: 200 },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
    attachments: [
      {
        url: { type: String, required: true },
        order: { type: Number, default: 0, min: 0 },
        s3Key: { type: String, required: true, unique: true },
      },
    ],
    createdBy: {
      index: true,
      required: true,
      ref: "CommunityMember",
      type: Schema.Types.ObjectId,
    },
    community: {
      index: true,
      required: true,
      ref: "Community",
      type: Schema.Types.ObjectId,
    },
    status: {
      index: true,
      type: String,
      default: "active",
      enum: ["active", "archived"],
    },
  },
  { timestamps: true }
);

// Text Search Indexing
ForumPostSchema.index({ title: "text", content: "text", tags: "text" });

export const ForumPost = mongoose.model<IForumPost>(
  "ForumPost",
  ForumPostSchema
);
