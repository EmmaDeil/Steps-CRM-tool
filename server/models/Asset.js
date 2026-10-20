const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    assetTag: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "HVAC",
        "Electrical",
        "Plumbing",
        "IT Equipment",
        "Vehicle",
        "Furniture",
        "Safety Equipment",
        "Machinery",
        "Other",
      ],
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    serialNumber: {
      type: String,
      trim: true,
    },
    location: {
      building: {
        type: String,
        required: true,
      },
      floor: {
        type: String,
      },
      room: {
        type: String,
      },
      specificLocation: {
        type: String,
      },
    },
    status: {
      type: String,
      required: true,
      enum: ["Operational", "Under Maintenance", "Out of Service", "Retired", "Disposed"],
      default: "Operational",
    },
    condition: {
      type: String,
      enum: ["Excellent", "Good", "Fair", "Poor"],
      default: "Good",
    },
    purchaseDate: {
      type: Date,
    },
    purchaseCost: {
      type: Number,
      min: 0,
    },
    warrantyProvider: {
      type: String,
      trim: true,
    },
    warrantyExpiryDate: {
      type: Date,
    },
    custodian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    department: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
    },
    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique asset tag before saving
assetSchema.pre("save", async function (next) {
  if (this.isNew && !this.assetTag) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const count = await mongoose.model("Asset").countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
      },
    });

    this.assetTag = `AST-${year}${month}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

assetSchema.index({ assetTag: 1 });
assetSchema.index({ category: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ isActive: 1 });
assetSchema.index({ createdAt: -1 });

const Asset = mongoose.model("Asset", assetSchema);

module.exports = Asset;
