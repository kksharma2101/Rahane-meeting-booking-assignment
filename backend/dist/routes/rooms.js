import { Router } from 'express';
import { getRoomAvailability, listRooms } from '../controllers/room.controller.js';
const router = Router();
/**
 * GET /api/rooms
 * Returns all rooms.
 */
router.get('/', listRooms);
/**
 * GET /api/rooms/:id/availability?date=YYYY-MM-DD
 * Returns the 48-slot availability grid for a room on a given date.
 */
router.get('/:id/availability', getRoomAvailability);
export default router;
