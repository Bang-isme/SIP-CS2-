import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["anniversary", "vacation", "benefits_change", "birthday"],
            required: true,
        },
        // Threshold value (days for anniversary/vacation, null for others)
        threshold: {
            type: Number,
            default: 30, // e.g., 30 days before anniversary
        },
        description: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        lastTriggered: {
            type: Date,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export default mongoose.model("Alert", AlertSchema);
