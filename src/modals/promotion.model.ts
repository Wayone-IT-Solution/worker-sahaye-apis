import mongoose, { Schema, Document } from "mongoose";

export enum PromotionStatus {
    PENDING = "pending",
    REJECTED = "rejected",
    APPROVED = "approved",
}

export interface IPromotion extends Document {
    name: string;
    contactPerson: string;
    mobile: string;
    email: string;
    description?: string;
    userId: string;
    status: PromotionStatus;
    createdAt: Date;
    updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
            index: true,
        },
        contactPerson: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        mobile: {
            type: String,
            required: true,
            trim: true,
            maxlength: 20,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Invalid email"],
            index: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        description: {
            type: String,
            maxlength: 1000,
        },
        status: {
            type: String,
            enum: Object.values(PromotionStatus),
            default: PromotionStatus.PENDING,
            index: true,
        },
    },
    { timestamps: true }
);

export const Promotion = mongoose.model<IPromotion>(
    "Promotion",
    PromotionSchema
);
