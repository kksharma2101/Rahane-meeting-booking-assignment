import { Router } from 'express';
import {
    createBooking,
    getUserBookings,
    cancelBooking,
    getBookingById,
} from '../controllers/booking.controller';

const router = Router();

/**
 * POST /api/bookings
 * Create a new booking for one or more consecutive 30-minute slots.
 *
 * Body:
 *  {
 *    roomId: string,
 *    date: "YYYY-MM-DD",
 *    startTime: "HH:MM",
 *    endTime: "HH:MM",
 *    bookedBy: { name: string, email: string },
 *    title: string
 *  }
 */
router.post('/', createBooking);

/**
 * GET /api/bookings?email=user@example.com
 * Returns all bookings for a user identified by email.
 */
router.get('/', getUserBookings);

/**
 * GET /api/bookings/:id
 * Returns a single booking by ID.
 */
router.get('/:id', getBookingById);

/**
 * PATCH /api/bookings/:id/cancel
 * Cancel a booking.
 * Refund status is determined server-side based on time until booking start.
 */
router.patch('/:id/cancel', cancelBooking);

export default router;