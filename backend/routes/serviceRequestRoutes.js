
import express from 'express';
import mongoose from 'mongoose';
import ServiceRequest from '../models/ServiceRequest.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Verify login token
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const token = authHeader.split(' ')[1];

   const decoded = jwt.verify(token, process.env.JWT_SECRET);

const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};


 // Update the logged-in provider's GPS location
router.patch('/provider-location', protect, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only service providers can update their location.',
      });
    }

    const { latitude, longitude } = req.body;

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid latitude and longitude.',
      });
    }

    const provider = await Provider.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
        },
      },
      { new: true, runValidators: true }
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Provider location updated successfully.',
      location: {
        latitude,
        longitude,
      },
    });
  } catch (error) {
    console.error('Provider location update error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update provider location.',
    });
  }
});


/**
 * GET /api/service-requests/nearby
 * Find the nearest available providers for a service.
 *
 * Query parameters:
 * latitude, longitude, serviceType, k (optional)
 */
router.get('/nearby', protect, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can search for nearby providers.',
      });
    }

    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    const serviceType = String(req.query.serviceType || '').trim();
    const k = Math.min(
      20,
      Math.max(1, parseInt(req.query.k, 10) || 5)
    );

    if (
      !serviceType ||
      req.query.latitude === undefined ||
      req.query.longitude === undefined ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide a valid serviceType, latitude and longitude.',
      });
    }

    // Get available providers with saved GPS coordinates.
    const providers = await Provider.find({
      isAvailable: true,
      'location.type': 'Point',
      'location.coordinates.0': { $exists: true },
      'location.coordinates.1': { $exists: true },
    }).populate('user', 'name mobile');

    // Haversine formula calculates the distance in kilometres.
    const toRadians = (degrees) => (degrees * Math.PI) / 180;

    const calculateDistance = (
      customerLat,
      customerLon,
      providerLat,
      providerLon
    ) => {
      const earthRadiusKm = 6371;

      const dLat = toRadians(providerLat - customerLat);
      const dLon = toRadians(providerLon - customerLon);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(customerLat)) *
          Math.cos(toRadians(providerLat)) *
          Math.sin(dLon / 2) ** 2;

      const safeA = Math.min(1, Math.max(0, a));

      return (
        2 *
        earthRadiusKm *
        Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA))
      );
    };

    const nearbyProviders = providers
      .filter((provider) => {
        const coordinates = provider.location?.coordinates;

        return (
          provider.user &&
          provider.serviceType?.trim().toLowerCase() ===
            serviceType.toLowerCase() &&
          Array.isArray(coordinates) &&
          coordinates.length === 2 &&
          Number.isFinite(coordinates[0]) &&
          Number.isFinite(coordinates[1]) &&
          coordinates[0] >= -180 &&
          coordinates[0] <= 180 &&
          coordinates[1] >= -90 &&
          coordinates[1] <= 90
        );
      })
      .map((provider) => {
        const [providerLongitude, providerLatitude] =
          provider.location.coordinates;

        const distanceKm = calculateDistance(
          latitude,
          longitude,
          providerLatitude,
          providerLongitude
        );

        return {
          providerId: provider.user._id,
          name: provider.user.name,
          mobile: provider.user.mobile,
          serviceType: provider.serviceType,
          latitude: providerLatitude,
          longitude: providerLongitude,
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // Select the nearest K providers.
    const selectedProviders = nearbyProviders.slice(0, k);

    return res.json({
      success: true,
      message: selectedProviders.length
        ? 'Nearby providers found.'
        : 'No available providers with saved locations were found for this service.',
      customerLocation: { latitude, longitude },
      requestedCount: k,
      count: selectedProviders.length,
      providers: selectedProviders,
    });
  } catch (error) {
    console.error('Nearby providers error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to find nearby providers.',
    });
  }
});


// Create a service request (customer)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can create service requests.',
      });
    }

    const { serviceType, description, address } = req.body;

    if (!serviceType?.trim() || !address?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service type and address are required.',
      });
    }

    const request = await ServiceRequest.create({
      customer: req.user._id,
      serviceType: serviceType.trim(),
      description: description?.trim() || '',
      address: address.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Service request created successfully.',
      request,
    });
  } catch (error) {
    console.error('Create service request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to create service request.',
    });
  }
});

// List pending requests for providers
router.get('/available', protect, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can view available requests.',
      });
    }

    const providerProfile = await Provider.findOne({
      user: req.user._id,
    });

    if (!providerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found.',
      });
    }

    const requests = await ServiceRequest.find({
      status: 'pending',
      provider: null,
      serviceType: {
        $regex: `^${providerProfile.serviceType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i',
      },
    })
      .populate('customer', 'name mobile')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error('List available requests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load available requests.',
    });
  }
});


router.get('/my-requests', protect, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only service providers can view these requests.',
      });
    }

    const requests = await ServiceRequest.find({
      provider: req.user._id,
      status: {
        $in: ['accepted', 'in_progress', 'completed'],
      },
    })
      .populate('customer', 'name mobile')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error('My requests error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch your requests.',
    });
  }
});


// Accept a request
router.patch('/:id/accept', protect, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can accept requests.',
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID.',
      });
    }

    const request = await ServiceRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'pending',
        provider: null,
      },
      {
        $set: {
          provider: req.user._id,
          status: 'accepted',
        },
      },
      { new: true, runValidators: true }
    ).populate('customer', 'name mobile');

    if (!request) {
      return res.status(409).json({
        success: false,
        message: 'This request is no longer available.',
      });
    }

    return res.json({
      success: true,
      message: 'Service request accepted.',
      request,
    });
  } catch (error) {
    console.error('Accept service request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to accept service request.',
    });
  }
});


router.patch('/:id/status', protect, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can update request status.',
      });
    }

    const { status } = req.body;

    if (!['in_progress', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be in_progress or completed.',
      });
    }

    const request = await ServiceRequest.findOne({
      _id: req.params.id,
      provider: req.user._id,
      status: status === 'in_progress' ? 'accepted' : 'in_progress',
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or status transition is not allowed.',
      });
    }

    request.status = status;
    await request.save();

    res.json({
      success: true,
      message: 'Request status updated successfully.',
      request,
    });
  } catch (error) {
    console.error('Status update error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to update request status.',
    });
  }
});

// Reject a request
router.patch('/:id/reject', protect, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can reject requests.',
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID.',
      });
    }

    // Keep the request available for another provider.
    // A production system should also record which providers rejected it.
    const request = await ServiceRequest.findOne({
      _id: req.params.id,
      status: 'pending',
      provider: null,
    });

    if (!request) {
      return res.status(409).json({
        success: false,
        message: 'This request is no longer available.',
      });
    }

    return res.json({
      success: true,
      message: 'Request rejected by you. It remains available to other providers.',
    });
  } catch (error) {
    console.error('Reject service request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to reject service request.',
    });
  }
});


router.get('/customer-requests', protect, async (req, res) => {
  try {
    const requests = await ServiceRequest.find({
      customer: req.user._id,
    })
      .populate('provider', 'name mobile')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error('Customer requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your service requests.',
    });
  }
});

export default router;
