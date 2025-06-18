import mongoose, { Schema, Document, Types } from "mongoose";

export enum CommunityPrivacy {
  PUBLIC = "public",
  PRIVATE = "private",
}

export enum CommunityType {
  TECH = "tech",
  OTHER = "other",
  GAMING = "gaming",
  SPORTS = "sports",
  HEALTH = "health",
  GENERAL = "general",
  CREATIVE = "creative",
  BUSINESS = "business",
  EDUCATION = "education",
}

export enum CommunityStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export enum MemberRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
  MODERATOR = "moderator",
  RESTRICTED = "restricted",
}

export interface ICommunityStats {
  totalPosts: number;
  totalMembers: number;
  totalComments: number;
  activeMembers: number;
}

export interface ICommunityLocation {
  city?: string;
  state?: string;
}

// 🏆 Main Interface
export interface ICommunity extends Document {
  name: string;
  tags: string[];
  updatedAt: Date;
  createdAt: Date;
  type: CommunityType;
  description?: string;
  bannerImage?: string;
  profileImage?: string;
  averageRating?: number;
  stats: ICommunityStats;
  status: CommunityStatus;
  shortDescription?: string;
  privacy: CommunityPrivacy;
  categories: Types.ObjectId;
  location?: ICommunityLocation;
}

// 🏗️ Advanced Schema
const CommunitySchema = new Schema<ICommunity>(
  {
    name: {
      type: String,
      required: [true, "Community name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
      validate: {
        validator: function (v: string) {
          return /^[a-zA-Z0-9\s\-_&.]+$/.test(v);
        },
        message: "Name contains invalid characters",
      },
    },
    description: {
      type: String,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
      trim: true,
    },
    shortDescription: {
      type: String,
      maxlength: [200, "Short description cannot exceed 200 characters"],
      trim: true,
    },
    privacy: {
      type: String,
      enum: {
        values: Object.values(CommunityPrivacy),
        message: "Invalid privacy setting",
      },
      default: CommunityPrivacy.PUBLIC,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(CommunityType),
      default: CommunityType.GENERAL,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CommunityStatus),
      default: CommunityStatus.ACTIVE,
      index: true,
    },
    bannerImage: { type: String },
    profileImage: { type: String },
    stats: {
      totalPosts: { type: Number, default: 0 },
      totalMembers: { type: Number, default: 0 },
      totalComments: { type: Number, default: 0 },
      activeMembers: { type: Number, default: 0 },
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 30,
        lowercase: true,
      },
    ],
    categories: {
      type: Schema.Types.ObjectId,
      ref: "JobCategory",
      required: true,
    },
    location: {
      city: String,
      state: String,
    },
  },
  { timestamps: true }
);

// 🏷️ Advanced Indexes
CommunitySchema.index({ owner: 1, status: 1 });
CommunitySchema.index({ tags: 1, categories: 1 });
CommunitySchema.index({ privacy: 1, status: 1, type: 1 });
CommunitySchema.index({ name: "text", description: "text", tags: "text" });
CommunitySchema.index({ "stats.engagement": -1, "stats.lastActivity": -1 });

CommunitySchema.statics.findPublic = function () {
  return this.find({
    privacy: CommunityPrivacy.PUBLIC,
    status: CommunityStatus.ACTIVE,
  });
};

CommunitySchema.statics.searchCommunities = function (
  query: string,
  filters: any = {}
) {
  return this.find({
    $and: [
      { $text: { $search: query } },
      { status: CommunityStatus.ACTIVE },
      filters,
    ],
  }).sort({ score: { $meta: "textScore" } });
};

export const Community = mongoose.model<ICommunity>(
  "Community",
  CommunitySchema
);
