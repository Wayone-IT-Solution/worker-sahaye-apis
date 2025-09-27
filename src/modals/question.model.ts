import mongoose, { Schema, Document } from "mongoose";

interface INext {
  answer: string;           // the answer that triggers this next step
  nextStep: number;         // step number to go to next
  conditions?: Record<string, any>; // optional conditions for branching
}

export interface IQuestion extends Document {
  step: number;            // step number in the flow
  flow: string;            // flow identifier (e.g., "EPF", "ESIC")
  question: string;        // the question text
  answer: string;          // default answer if needed
  options: string[];       // all possible options
  next?: INext[];          // next steps based on answers
  createdAt: Date;
  updatedAt: Date;
}

const NextSchema = new Schema<INext>(
  {
    answer: { type: String, required: true },
    nextStep: { type: Number, required: true },
    conditions: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>(
  {
    next: [NextSchema],
    answer: { type: String, default: "" },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    step: { type: Number, required: true, index: true },
    flow: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

// Compound index to speed up flow+step queries
QuestionSchema.index({ flow: 1, step: 1 }, { unique: true });

export default mongoose.model<IQuestion>("Question", QuestionSchema);
