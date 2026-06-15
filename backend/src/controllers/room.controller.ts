import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Room } from '../models/room.model.js';
import { SlotLock } from '../models/booking.model.js';

import {
    generateDaySlots,
    isValidDate,
    minutesToTime,
    timeToMinutes,
} from '../utils/slots.js';

import { successResponse } from '../lib/response.js';
import { NotFoundError, ValidationError } from '../lib/error.js';
import { SlotInfo } from '../types/Index.js';

// Get all rooms
export async function listRooms(
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const rooms = await Room.find().sort({ name: 1 });
        if (!rooms.length) {
            throw new NotFoundError('Room');
        }
        successResponse(res, rooms);
    } catch (err) {
        next(err);
    }
}

// GET /api/rooms/:id/availability?date=YYYY-MM-DD
export async function getRoomAvailability(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { id } = req.params;
        const { date } = req.query as { date?: string };

        // validate inputs
        if (!mongoose.isValidObjectId(id)) {
            throw new ValidationError('Invalid room ID');
        }
        if (!date || !isValidDate(date)) {
            throw new ValidationError(
                'Query parameter "date" is required and must be in YYYY-MM-DD format'
            );
        }

        // Confirm room exists
        const room = await Room.findById(id);
        if (!room) {
            throw new NotFoundError('Room');
        }

        // Fetch all CONFIRMED bookings for this room on this date

        // We read from the same SlotLock collection that the booking-creation path writes to, so the availability view is ALWAYS consistent with what can actually be booked.  A slot shown "available" here WILL be bookable — the only way it could fail is if another request wins the race in the tiny window between this read and the write, which the unique index will catch and report as a 409.

        const takenLocks = await SlotLock.find({
            room: id,
            date,
        }).populate('bookingId', 'bookedBy title status');

        // Build a map: slotStart → lock info
        interface LockInfo {
            bookingId: mongoose.Types.ObjectId;
            bookedByName: string;
            title: string;
            status: string;
        }
        const takenMap = new Map<string, LockInfo>();

        for (const lock of takenLocks) {
            const booking = lock.bookingId as unknown as {
                _id: mongoose.Types.ObjectId;
                bookedBy: { name: string };
                title: string;
                status: string;
            };
            if (booking && booking.status === 'confirmed') {
                takenMap.set(lock.slotStart, {
                    bookingId: booking._id,
                    bookedByName: booking.bookedBy.name,
                    title: booking.title,
                    status: booking.status,
                });
            }
        }

        // Build full 48-slot grid 
        const allSlots = generateDaySlots();
        const grid: SlotInfo[] = allSlots.map((slotStart) => {
            const slotEndMinutes = timeToMinutes(slotStart) + 30;
            const slotEnd = minutesToTime(slotEndMinutes >= 24 * 60 ? 0 : slotEndMinutes);
            const lock = takenMap.get(slotStart);

            if (lock) {
                return {
                    start: slotStart,
                    end: slotEnd,
                    available: false,
                    bookingId: lock.bookingId.toString(),
                    bookedBy: lock.bookedByName,
                    title: lock.title,
                };
            }

            return {
                start: slotStart,
                end: slotEnd,
                available: true,
            };
        });

        successResponse(res, {
            room: {
                id: room._id,
                name: room.name,
                location: room.location,
                floor: room.floor,
                capacity: room.capacity,
                amenities: room.amenities,
            },
            date,
            slots: grid,
            summary: {
                total: grid.length,
                available: grid.filter((s) => s.available).length,
                booked: grid.filter((s) => !s.available).length,
            },
        });
    } catch (err) {
        next(err);
    }
}