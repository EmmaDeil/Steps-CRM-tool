const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    contactId: {
      type: String,
      unique: true,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    profilePicture: {
      name: String,
      data: String,
      size: Number,
      type: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    socialMedia: {
      linkedin: {
        type: String,
        trim: true,
      },
      twitter: {
        type: String,
        trim: true,
      },
      facebook: {
        type: String,
        trim: true,
      },
    },
    category: {
      type: String,
      enum: ['Client', 'Vendor', 'Employee', 'Partner', 'Other'],
      default: 'Other',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Archived'],
      default: 'Active',
    },
    tags: [String],
    notes: {
      type: String,
      trim: true,
    },
    lastContactDate: {
      type: Date,
    },
    preferredContactMethod: {
      type: String,
      enum: ['Email', 'Phone', 'SMS', 'LinkedIn', 'Other'],
      default: 'Email',
    },
    documents: [
      {
        name: String,
        data: String, // Base64 encoded file data
        size: Number,
        type: String, // MIME type
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique contact ID before validation
contactSchema.pre('validate', async function (next) {
  if (!this.contactId) {
    const count = await this.constructor.countDocuments();
    this.contactId = `CON-${String(count + 1000).padStart(5, '0')}`;
  }
  next();
});

// Index for faster searches
contactSchema.index({ firstName: 1, lastName: 1 });
contactSchema.index({ email: 1 });
contactSchema.index({ phone: 1 });
contactSchema.index({ company: 1 });
contactSchema.index({ category: 1 });

module.exports = mongoose.model('Contact', contactSchema);
