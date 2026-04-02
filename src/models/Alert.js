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
        acknowledgedAt: {
            type: Date,
        },
        acknowledgedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        acknowledgementNote: {
            type: String,
            trim: true,
            maxlength: 280,
        },
        acknowledgedCount: {
            type: Number,
        },
        acknowledgedSummaryAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

/**
 * Validation: Only one active alert per type allowed.
 * This prevents data inconsistency in aggregation (Case Study 4 requirement).
 */
AlertSchema.pre('save', async function (next) {
    if (this.isActive && this.isNew) {
        const existingActive = await mongoose.model('Alert').findOne({
            type: this.type,
            isActive: true,
            _id: { $ne: this._id }
        });

        if (existingActive) {
            const error = new Error(
                `An active alert of type "${this.type}" already exists. ` +
                `Deactivate "${existingActive.name}" first or create as inactive.`
            );
            error.code = 'DUPLICATE_ACTIVE_TYPE';
            return next(error);
        }
    }
    next();
});

/**
 * Also validate on update (when activating a previously inactive alert)
 */
AlertSchema.pre('findOneAndUpdate', async function (next) {
    const update = this.getUpdate();
    const docToUpdate = await this.model.findOne(this.getQuery());
    if (!docToUpdate) {
        return next();
    }

    const nextType = update.type ?? update.$set?.type ?? docToUpdate.type;
    const nextIsActive = update.isActive ?? update.$set?.isActive ?? docToUpdate.isActive;

    if (nextIsActive === true) {
        const existingActive = await this.model.findOne({
            type: nextType,
            isActive: true,
            _id: { $ne: docToUpdate._id }
        });

        if (existingActive) {
            const error = new Error(
                `Cannot activate: An active alert of type "${nextType}" already exists.`
            );
            error.code = 'DUPLICATE_ACTIVE_TYPE';
            return next(error);
        }
    }
    next();
});

export default mongoose.model("Alert", AlertSchema);
