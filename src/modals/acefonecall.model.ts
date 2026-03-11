import mongoose, { Schema, Document, Types } from "mongoose";

export enum AcefoneCallStatus {
  ANSWERED = "answered",
  MISSED = "missed",
  NO_ANSWER = "no_answer",
  INITIATED = "initiated",
  IN_PROGRESS = "in_progress",
}

export interface IAcefoneAgent {
  id?: string;
  name?: string;
  dialst?: string;
  number?: string;
  agent_number?: string;
}

export interface IAcefoneMissedAgent {
  id?: string;
  name?: string;
  number?: string;
  agent_number?: string;
}

export interface IAcefoneCallFlow {
  type?: string;
  value?: string;
  time?: string | number;
  id?: string;
  name?: string;
  dialst?: string;
  num?: string;
  number?: string;
  anstime?: number;
}

export interface IAcefoneBillingCircle {
  operator?: string;
  circle?: string;
}

export interface IAcefoneCall extends Document {
  uuid?: string;
  call_to_number: string;
  caller_id_number: string;
  start_stamp: string;
  answer_stamp?: string;
  end_stamp?: string;
  billsec: string;
  digits_dialed?: string;
  direction: string;
  duration: string;
  answered_agent?: IAcefoneAgent;
  answered_agent_name?: string;
  answered_agent_number?: string;
  missed_agent?: IAcefoneMissedAgent[];
  call_flow?: IAcefoneCallFlow[];
  broadcast_lead_fields?: string;
  recording_url?: string;
  call_status: AcefoneCallStatus;
  call_id?: string;
  outbound_sec?: string;
  agent_ring_time?: string;
  agent_transfer_ring_time?: string;
  billing_circle?: IAcefoneBillingCircle;
  call_connected?: string;
  aws_call_recording_identifier?: string;
  customer_no_with_prefix?: string;
  campaign_name?: string;
  campaign_id?: string;
  customer_ring_time?: string;
  reason_key?: string;
  hangup_cause_description?: string;
  hangup_cause_code?: string;
  hangup_cause_key?: string;
  ref_id?: string;
  // business-specific field indicating which service triggered the call
  callField?: "ESIC" | "EPFO" | "LOAN" | "LWF";
  // optional type label provided during creation
  callType?: string;
  // Additional fields for our system
  userId?: Types.ObjectId; // Reference to User who initiated the call
  agentId?: Types.ObjectId; // Reference to Admin/CallSupportAgent who answered
  createdAt: Date;
  updatedAt: Date;
}

const AcefoneCallSchema = new Schema<IAcefoneCall>(
  {
    uuid: { type: String, unique: true, sparse: true },
    call_to_number: { type: String, required: true },
    caller_id_number: { type: String, required: true },
    start_stamp: { type: String, required: true },
    answer_stamp: { type: String },
    end_stamp: { type: String },
    billsec: { type: String, required: true },
    digits_dialed: { type: String },
    direction: { type: String, required: true },
    duration: { type: String, required: true },
    answered_agent: {
      id: { type: String },
      name: { type: String },
      dialst: { type: String },
      number: { type: String },
      agent_number: { type: String },
    },
    answered_agent_name: { type: String },
    answered_agent_number: { type: String },
    missed_agent: [
      {
        id: { type: String },
        name: { type: String },
        number: { type: String },
        agent_number: { type: String },
      },
    ],
    call_flow: [
      {
        type: { type: String },
        value: { type: String },
        time: { type: Schema.Types.Mixed },
        id: { type: String },
        name: { type: String },
        dialst: { type: String },
        num: { type: String },
        number: { type: String },
        anstime: { type: Number },
      },
    ],
    broadcast_lead_fields: { type: String },
    recording_url: { type: String },
    call_status: {
      type: String,
      enum: Object.values(AcefoneCallStatus),
      required: true,
    },
    call_id: { type: String },
    callField: {
      type: String,
      enum: ["ESIC", "EPFO", "LOAN", "LWF"],
    },
    callType: { type: String },
    outbound_sec: { type: String },
    agent_ring_time: { type: String },
    agent_transfer_ring_time: { type: String },
    billing_circle: {
      operator: { type: String },
      circle: { type: String },
    },
    call_connected: { type: String },
    aws_call_recording_identifier: { type: String },
    customer_no_with_prefix: { type: String },
    campaign_name: { type: String },
    campaign_id: { type: String },
    customer_ring_time: { type: String },
    reason_key: { type: String },
    hangup_cause_description: { type: String },
    hangup_cause_code: { type: String },
    hangup_cause_key: { type: String },
    ref_id: { type: String },
    // References to our system entities
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    agentId: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true },
);

// Indexes for efficient querying
AcefoneCallSchema.index({ uuid: 1 });
AcefoneCallSchema.index({ call_id: 1 });
AcefoneCallSchema.index({ call_status: 1 });
AcefoneCallSchema.index({ userId: 1 });
AcefoneCallSchema.index({ agentId: 1 });
AcefoneCallSchema.index({ callField: 1 });
AcefoneCallSchema.index({ ref_id: 1 });
AcefoneCallSchema.index({ createdAt: -1 });

export const AcefoneCall = mongoose.model<IAcefoneCall>(
  "AcefoneCall",
  AcefoneCallSchema,
);
