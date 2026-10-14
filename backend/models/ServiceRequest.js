
import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    serviceType: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'rejected',
        'in_progress',
        'completed',
        'cancelled',
      ],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model('ServiceRequest', serviceRequestSchema);
