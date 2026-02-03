import mongoose, { Document, Model, Schema } from "mongoose";

export interface IColumnDefinition {
  name: string;
  label: string;
  type: "string" | "number" | "date";
  required?: boolean;
}

export interface IWageRow {
  [key: string]: string | number;
}

export interface IMinimumWage extends Document {
  state: string;
  columns: IColumnDefinition[];
  rows: IWageRow[];
  createdBy?: string;
  updatedBy?: string;
}

const ColumnDefinitionSchema = new Schema<IColumnDefinition>({
  name: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  type: { type: String, enum: ["string", "number", "date"], default: "string" },
  required: { type: Boolean, default: false },
});

const WageRowSchema = new Schema<IWageRow>(
  {
    // Dynamic fields based on columns
  },
  { strict: false }
);

const MinimumWageSchema: Schema<IMinimumWage> = new Schema(
  {
    state: { type: String, required: true, trim: true, index: true },
    columns: [ColumnDefinitionSchema],
    rows: [WageRowSchema],
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

MinimumWageSchema.index({ state: 1 }, { unique: true });

const MinimumWage: Model<IMinimumWage> = mongoose.model<IMinimumWage>(
  "MinimumWage",
  MinimumWageSchema
);

export default MinimumWage;
