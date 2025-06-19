import { Schema, model, Document } from "mongoose";

export interface IContentBlock extends Document {
  key: string;
  title: string;
  sections: {
    heading: string;
    type: "text" | "list" | "bullets" | "buttons";
    content: string | string[] | { label: string; action: string }[];
  }[];
  access: "free" | "paid" | "premium";
}

const ContentBlockSchema = new Schema<IContentBlock>(
  {
    title: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    access: {
      type: String,
      default: "free",
      enum: ["free", "paid", "premium"],
    },
    sections: [
      {
        heading: { type: String, required: true },
        type: {
          type: String,
          required: true,
          enum: ["text", "list", "bullets", "buttons"],
        },
        content: Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

export const ContentBlock = model<IContentBlock>(
  "ContentBlock",
  ContentBlockSchema
);
