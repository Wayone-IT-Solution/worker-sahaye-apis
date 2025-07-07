import { UserType } from "./user.model";
import mongoose, { Schema, Document, Types } from "mongoose";

export enum MemberStatus {
  JOINED = "joined",
  PENDING = "pending",
  INVITED = "invited",
  REMOVED = "removed",
  BLOCKED = "blocked",
}

export enum JoinSource {
  INVITE = "invite",
  DIRECT = "direct",
}

export interface ICommunityMember extends Document {
  joinedAt?: Date;
  userType?: UserType;
  user: Types.ObjectId;
  status: MemberStatus;
  joinSource?: JoinSource;
  community: Types.ObjectId;
  invitedBy?: Types.ObjectId;
}

const CommunityMemberSchema = new Schema<ICommunityMember>(
  {
    user: {
      ref: "User",
      index: true,
      required: true,
      type: Schema.Types.ObjectId,
    },
    userType: { type: String, enum: Object.values(UserType), required: true },
    community: {
      index: true,
      required: true,
      ref: "Community",
      type: Schema.Types.ObjectId,
    },
    status: {
      type: String,
      default: MemberStatus.JOINED,
      enum: Object.values(MemberStatus),
    },
    joinedAt: { type: Date },
    invitedBy: { ref: "User", type: Schema.Types.ObjectId },
    joinSource: { type: String, enum: Object.values(JoinSource) },
  },
  { timestamps: true }
);

CommunityMemberSchema.index({ community: 1, user: 1 }, { unique: true });
CommunityMemberSchema.index({ community: 1, status: 1 });
CommunityMemberSchema.index({ user: 1, status: 1 });
CommunityMemberSchema.index({ community: 1, userType: 1, status: 1 });
CommunityMemberSchema.index({ invitedBy: 1 });
CommunityMemberSchema.index({ joinedAt: -1 });

export const CommunityMember = mongoose.model<ICommunityMember>(
  "CommunityMember",
  CommunityMemberSchema
);
