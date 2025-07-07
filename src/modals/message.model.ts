import mongoose, { Document, Model, Schema } from "mongoose";

// Define TypeScript interface for the Message document
export interface IMessage extends Document {
  text?: string;
  createdAt: Date;
  updatedAt: Date;
  isRead: boolean;
  chatFileUrl?: string;
  sender: "user" | "admin";
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
}

// Mongoose schema definition
const MessageSchema: Schema<IMessage> = new Schema(
  {
    sender: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    text: {
      type: String,
      trim: true,
    },
    chatFileUrl: {
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Create and export the Message model
const Message: Model<IMessage> = mongoose.model<IMessage>(
  "Message",
  MessageSchema,
);

export default Message;
