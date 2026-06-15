import { Router } from 'express';
import { getRoomAvailability, listRooms } from '../controllers/room.controller.js';

const router = Router();

// GET /api/rooms
router.get('/', listRooms);

// GET /api/rooms/:id/availability?date=YYYY-MM-DD
router.get('/:id/availability', getRoomAvailability);

export default router;