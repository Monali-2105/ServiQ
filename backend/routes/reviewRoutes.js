
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ServiceRequest from '../models/ServiceRequest.js';
import Review from '../models/Review.js';

const router = express.Router();

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Please log in.',
      });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
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

// Submit a review for a completed service
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can submit reviews.',
      });
    }

    const { serviceRequestId, rating, comment = '' } = req.body;

    if (
      !serviceRequestId ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      typeof comment !== 'string' ||
      comment.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide a valid request ID, rating, and comment.',
      });
    }

    const request = await ServiceRequest.findById(serviceRequestId);

    if (!request || String(request.customer) !== String(req.user._id)) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.',
      });
    }

    if (request.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can review only completed services.',
      });
    }

    if (!request.provider) {
      return res.status(400).json({
        success: false,
        message: 'No provider is assigned to this request.',
      });
    }

    const existingReview = await Review.findOne({
      serviceRequest: request._id,
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this service.',
      });
    }

    const review = await Review.create({
      customer: req.user._id,
      provider: request.provider,
      serviceRequest: request._id,
      serviceType: request.serviceType,
      rating,
      comment: comment.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Rating and review submitted successfully.',
      review,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This service has already been reviewed.',
      });
    }

    console.error('Submit review error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not submit review.',
    });
  }
});

// Get the logged-in customer's review history
router.get('/my-reviews', protect, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can access this review history.',
      });
    }

    const reviews = await Review.find({
      customer: req.user._id,
    })
      .populate('provider', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: reviews.length,
      reviews: reviews.map((review) => ({
        ...review,
        providerName: review.provider?.name || 'Service provider',
      })),
    });
  } catch (error) {
    console.error('Get reviews error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not load your reviews.',
    });
  }
});

export default router;
