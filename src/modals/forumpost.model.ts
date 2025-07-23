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
  postedByAdmin?: Types.ObjectId;
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
      ref: "CommunityMember",
      type: Schema.Types.ObjectId,
    },
    community: {
      index: true,
      required: true,
      ref: "Community",
      type: Schema.Types.ObjectId,
    },
    postedByAdmin: {
      index: true,
      ref: "Admin",
      type: Schema.Types.ObjectId,
    },
    status: {
      index: true,
      type: String,
      default: "active",
      enum: ["active", "inactive", "rejected", "hiring_content"],
    },
  },
  { timestamps: true }
);

ForumPostSchema.index({ community: 1 });                  // Filter posts by community
ForumPostSchema.index({ createdBy: 1 });                  // Filter posts by user
ForumPostSchema.index({ status: 1 });                     // Filter by post status (active/archived)
ForumPostSchema.index({ createdAt: -1 });                 // For sorting posts by latest
ForumPostSchema.index({ tags: 1 });                       // Search/filter by tags
ForumPostSchema.index({ title: "text", content: "text" }); // Full-text search on title + content
ForumPostSchema.index({ community: 1, status: 1 });       // Compound: active posts in a community
ForumPostSchema.index({ community: 1, createdAt: -1 });   // Recent posts in a community

export const ForumPost = mongoose.model<IForumPost>(
  "ForumPost",
  ForumPostSchema
);
