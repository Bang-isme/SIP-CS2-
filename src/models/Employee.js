import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
    },
    // Demographics
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    ethnicity: {
      type: String,
    },
    // Employment info
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time"],
      default: "Full-time",
    },
    isShareholder: {
      type: Boolean,
      default: false,
    },
    // Department reference
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    // Important dates (for alerts)
    hireDate: {
      type: Date,
    },
    birthDate: {
      type: Date,
    },
    // Legacy fields (kept for backwards compatibility)
    vacationDays: {
      type: Number,
      default: 0,
    },
    paidToDate: {
      type: Number,
      default: 0,
    },
    paidLastYear: {
      type: Number,
      default: 0,
    },
    payRate: {
      type: Number,
      default: 0,
    },
    payRateId: {
      type: Number,
    },
    // Derived analytics (updated by aggregation job)
    annualEarnings: {
      type: Number,
      default: 0,
    },
    annualEarningsYear: {
      type: Number,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for efficient queries
EmployeeSchema.index({ departmentId: 1 });
EmployeeSchema.index({ annualEarningsYear: 1, annualEarnings: 1 });
// Removed low-cardinality indexes (gender, employmentType, isShareholder) to save ~100MB Data Size

export default mongoose.model("Employee", EmployeeSchema);
