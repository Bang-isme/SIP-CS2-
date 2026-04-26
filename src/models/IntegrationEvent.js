import mongoose from "mongoose";

const IntegrationEventSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    entity_type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    entity_id: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE"],
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    correlation_id: {
      type: String,
      default: null,
      maxlength: 120,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "DEAD"],
      required: true,
      default: "PENDING",
      index: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    last_error: {
      type: String,
      default: null,
    },
    next_run_at: {
      type: Date,
      default: null,
      index: true,
    },
    processed_at: {
      type: Date,
      default: null,
    },
    last_operator_action: {
      type: String,
      default: null,
      maxlength: 40,
    },
    last_operator_actor_id: {
      type: String,
      default: null,
      maxlength: 100,
    },
    last_operator_request_id: {
      type: String,
      default: null,
      maxlength: 120,
    },
    last_operator_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "integration_events",
  },
);

IntegrationEventSchema.index({ createdAt: -1 });
IntegrationEventSchema.index({ updatedAt: -1 });
IntegrationEventSchema.index({ entity_type: 1 });
IntegrationEventSchema.index({ correlation_id: 1 });

export default mongoose.models.MongoIntegrationEvent
  || mongoose.model("MongoIntegrationEvent", IntegrationEventSchema);
