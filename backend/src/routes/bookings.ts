import { Router } from 'express';
import {
    createBooking,
    getUserBookings,
    cancelBooking,
    getBookingById,
} from '../controllers/booking.controller.js';

const router = Router();

// POST /api/bookings
router.post('/', createBooking);

// GET /api/bookings?email
// Returns all bookings for a user identified by email.
router.get('/', getUserBookings);

// GET /api/bookings/:id
router.get('/:id', getBookingById);

/**
 * PATCH /api/bookings/:id/cancel
 * Cancel a booking.
 * Refund status is determined server-side based on time until booking start.
 */
router.patch('/:id/cancel', cancelBooking);

export default router;