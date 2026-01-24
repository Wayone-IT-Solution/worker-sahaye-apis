import mongoose, { Schema, Document, Types } from "mongoose";
// import { IBadge } from "./badge.model";

export enum UserType {
    WORKER = "worker",
    EMPLOYER = "employer",
    CONTRACTOR = "contractor",
}

export interface IBadgeBundle extends Document {
    name: string;
    slug: string;
    description?: string; // Optional description of the bundle
    badges: Types.ObjectId[]; // References to Badge documents
    fee?: number; // Price or fee for the bundle
    isActive: boolean;
    userTypes: UserType[];
    createdAt: Date;
    updatedAt: Date;
}

const BadgeBundleSchema = new Schema<IBadgeBundle>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        description: {
            type: String,
            maxlength: 500,
        },
        badges: [
            {
                type: Schema.Types.ObjectId,
                ref: "Badge",
                required: true,
            },
        ],
        userTypes: {
            type: [String],
            enum: Object.values(UserType),
            required: true,
            index: true,
        },
        fee: {
            type: Number,
            default: 0,
            min: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

// 🔄 Auto-generate slug
BadgeBundleSchema.pre("validate", function (next) {
    if (this.name && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "");
    }
    next();
});

export const BadgeBundle = mongoose.model<IBadgeBundle>(
    "BadgeBundle",
    BadgeBundleSchema
);
