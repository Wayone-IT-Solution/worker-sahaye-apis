import mongoose, { Schema, Document } from "mongoose";

interface IAnswer {
  step: number;             // step number of the question answered
  flow: string;             // flow/feature this question belongs to
  selected: string;         // user’s selected answer
  timestamp?: Date;         // optional timestamp for this answer
  conditionsMet?: Record<string, any>; // optional info about conditional logic evaluated
}

export interface IConversation extends Document {
  userId: string;           // user identifier
  currentStep: number;      // current step in the flow
  currentFlow: string;      // current active flow/feature
  answers: IAnswer[];       // all answers so far
  isCompleted: boolean;     // true if flow ended
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    step: { type: Number, required: true },
    flow: { type: String, required: true },
    selected: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    conditionsMet: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    userId: { type: String, required: true, index: true },
    currentStep: { type: Number, default: 0 },
    currentFlow: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    answers: [AnswerSchema],
  },
  { timestamps: true }
);

// Optional: compound index to quickly find user's current flow/step
ConversationSchema.index({ userId: 1, currentFlow: 1, currentStep: 1 });

export default mongoose.model<IConversation>("Conversation", ConversationSchema);
