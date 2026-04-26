import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    seq: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  },
);

export default mongoose.models.MongoSequenceCounter
  || mongoose.model("MongoSequenceCounter", CounterSchema);
