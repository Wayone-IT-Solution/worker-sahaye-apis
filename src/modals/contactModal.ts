import mongoose, { Schema, Document } from "mongoose";

/**
 * Contact form schema
 * @typedef {Object} IContact
 * @property {string} email - User's email
 * @property {string} username - User's name
 * @property {string} message - User's message
 * @property {Date|null} resolvedAt - Auto-set when resolved
 * @property {string|null} internalNote - Email response or reply from admin
 * @property {boolean} isResolved - Automatically set when internalNote is added
 */
export interface IContact extends Document {
  email: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  username: string;
  isResolved: boolean;
  resolvedAt?: Date | null;
  internalNote?: string | null;
}

const contactSchema = new Schema<IContact>(
  {
    email: { type: String, required: true },
    message: { type: String, required: true },
    resolvedAt: { type: Date, default: null },
    username: { type: String, required: true },
    isResolved: { type: Boolean, default: false },
    internalNote: { type: String, default: null },
  },
  { timestamps: true },
);

// Auto-mark resolved when internalNote is updated
contactSchema.pre<IContact>("save", function (next) {
  if (this.internalNote && !this.isResolved) {
    this.isResolved = true;
    this.resolvedAt = new Date();
  }
  next();
});

const Contact = mongoose.model<IContact>("Contact", contactSchema);

export default Contact;
