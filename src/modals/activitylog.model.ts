import mongoose, { Schema } from "mongoose";

const ActivityLogSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "role",
      required: false,
    },
    role: {
      type: String,
      required: false,
      enum: ["Passenger", "Rider", "Agent"],
    },
    action: { type: String },
    description: { type: String },
    pathParams: { type: Schema.Types.Mixed },
    requestBody: { type: Schema.Types.Mixed },
    queryParams: { type: Schema.Types.Mixed },
    responseBody: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);
