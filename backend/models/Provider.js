
import mongoose from 'mongoose';

const providerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    serviceType: {
      type: String,
      required: true,
      trim: true,
    },

    skills: {
      type: [String],
      default: [],
    },

    isAvailable: {
      type: Boolean,
      default: false,
    },

    

location: {
  type: {
    type: String,
    enum: ['Point'],
    default: undefined,
  },
  coordinates: {
    type: [Number],
    default: undefined,
    validate: {
      validator: function (coordinates) {
        if (coordinates == null) return true;

        return (
          coordinates.length === 2 &&
          coordinates.every(Number.isFinite) &&
          coordinates[0] >= -180 &&
          coordinates[0] <= 180 &&
          coordinates[1] >= -90 &&
          coordinates[1] <= 90
        );
      },
      message: 'Location must contain valid longitude and latitude.',
    },
  },
},

  },
  {
    timestamps: true,
  }
);

providerSchema.index({ location: '2dsphere' });

const Provider = mongoose.model('Provider', providerSchema);

export default Provider;
