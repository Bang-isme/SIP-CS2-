import mongoose from "mongoose";

const IntegrationEventAuditSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    integration_event_id: {
      type: Number,
      required: true,
      index: true,
    },
    operator_action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    operator_actor_id: {
      type: String,
      default: null,
      maxlength: 100,
    },
    operator_request_id: {
      type: String,
      default: null,
      maxlength: 120,
    },
    source_status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "DEAD", null],
      default: null,
    },
    target_status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "DEAD", null],
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "integration_event_audits",
  },
);

IntegrationEventAuditSchema.index({ integration_event_id: 1, createdAt: -1 });
IntegrationEventAuditSchema.index({ operator_action: 1 });
IntegrationEventAuditSchema.index({ operator_request_id: 1 });
IntegrationEventAuditSchema.index({ createdAt: -1 });

export default mongoose.models.MongoIntegrationEventAudit
  || mongoose.model("MongoIntegrationEventAudit", IntegrationEventAuditSchema);
