import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
    NotFoundError,
    ValidationError,
    ConflictError,
    BadRequestError,
} from '../lib/error.js';
import {
    getSlotsForRange,
    isValidDate,
    isValidSlotTime,
    timeToMinutes,
} from '../utils/slots.js';
import { CreateBookingBody } from '../types/Index.js';
import { Room } from '../models/room.model.js';
import { supportsTransactions } from '../config/db.js';
import { Booking, SlotLock } from '../models/booking.model.js';
import { successResponse } from '../lib/response.js';

//  POST /api/bookings — Create a booking
//  Concurrency strategy (detailed):
//
//  PROBLEM: "read → check → write" is NOT safe.
//    Thread A reads: slot 09:00 is free ✓
//    Thread B reads: slot 09:00 is free ✓   ← same result, race condition
//    Thread A writes booking — succeeds
//    Thread B writes booking — also succeeds → DOUBLE BOOKING!
//
//  SOLUTION: database-enforced uniqueness via SlotLock collection.
//    We attempt to INSERT one SlotLock document per requested slot.
//    The unique index on (room, date, slotStart) means only ONE insert can
//    succeed for any given triple — the database rejects duplicates with error
//    code 11000 (DuplicateKey).  This happens at the storage-engine level,
//    inside WiredTiger's document-level locking, so no two inserts can win.
//
//  Multi-slot all-or-nothing:
//    We use insertMany() with ordered:false so MongoDB attempts all inserts.
//    If ANY fails (duplicate key), we:
//      1. Roll back by deleting all SlotLock docs we just inserted
//      2. Delete the Booking document we already created
//      3. Return 409 Conflict
//
//  On replica sets / Atlas we additionally wrap in a MongoDB session
//  transaction so the rollback is guaranteed atomic.
//

export async function createBooking(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const body = req.body as CreateBookingBody;

        // 1. Input validation 
        const { roomId, date, startTime, endTime, bookedBy, title } = body;

        if (!roomId || !mongoose.isValidObjectId(roomId)) {
            throw new ValidationError('Valid roomId is required');
        }
        if (!date || !isValidDate(date)) {
            throw new ValidationError('date must be in YYYY-MM-DD format');
        }
        if (!startTime || !isValidSlotTime(startTime)) {
            throw new ValidationError(
                'startTime must be a valid 30-minute boundary (e.g. "09:00" or "09:30")'
            );
        }
        if (!endTime || !isValidSlotTime(endTime)) {
            throw new ValidationError(
                'endTime must be a valid 30-minute boundary (e.g. "10:00" or "10:30")'
            );
        }
        if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
            throw new ValidationError('endTime must be after startTime');
        }
        if (!bookedBy?.name?.trim()) {
            throw new ValidationError('bookedBy.name is required');
        }
        if (!bookedBy?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookedBy.email)) {
            throw new ValidationError('bookedBy.email must be a valid email address');
        }
        if (!title?.trim()) {
            throw new ValidationError('title is required');
        }

        // 2. Room existence check
        const room = await Room.findById(roomId);
        if (!room) {
            throw new NotFoundError('Room');
        }

        // 3. Compute slots
        let slots: string[];
        try {
            slots = getSlotsForRange(startTime, endTime);
        } catch (err) {
            throw new ValidationError((err as Error).message);
        }

        // 4. Check replica-set support for transactions
        const useTransaction = await supportsTransactions();

        if (useTransaction) {
            await createBookingWithTransaction(
                { roomId, date, startTime, endTime, bookedBy, title, slots },
                res
            );
        } else {
            await createBookingWithAtomicIndex(
                { roomId, date, startTime, endTime, bookedBy, title, slots },
                res
            );
        }
    } catch (err) {
        next(err);
    }
}

//  Strategy A: Replica set — full multi-document transaction

async function createBookingWithTransaction(
    params: {
        roomId: string;
        date: string;
        startTime: string;
        endTime: string;
        bookedBy: { name: string; email: string };
        title: string;
        slots: string[];
    },
    res: Response
): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { roomId, date, startTime, endTime, bookedBy, title, slots } = params;

        // Create the Booking document inside the transaction
        const [booking] = await Booking.create(
            [
                {
                    room: roomId,
                    date,
                    startTime,
                    endTime,
                    slots,
                    bookedBy: { name: bookedBy.name.trim(), email: bookedBy.email.toLowerCase().trim() },
                    title: title.trim(),
                    status: 'confirmed',
                },
            ],
            { session }
        );

        // Insert one SlotLock per slot — unique index violation aborts immediately
        const lockDocs = slots.map((slotStart) => ({
            room: new mongoose.Types.ObjectId(roomId),
            date,
            slotStart,
            bookingId: booking._id,
        }));

        try {
            await SlotLock.insertMany(lockDocs, {
                session,
                ordered: true, // Stop on first duplicate
            });
        } catch (err) {
            // Duplicate key — abort transaction, which rolls back EVERYTHING
            await session.abortTransaction();
            throw new ConflictError(
                'One or more requested time slots are already booked. Please choose a different time or room.'
            );
        }

        await session.commitTransaction();

        const populated = await Booking.findById(booking._id).populate('room', 'name location floor');
        successResponse(res, populated, 'Booking created successfully', 201);
    } catch (err) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw err;
    } finally {
        await session.endSession();
    }
}

//  Strategy B: Standalone mongod — atomic unique-index inserts + manual rollback
//
//  Without a replica set we cannot use multi-document transactions.
//  We still get safety via the unique index:
//    - We create the Booking first (no constraint on Booking itself).
//    - We then insert SlotLocks one-by-one in a try/catch.
//    - If any insert throws 11000, we delete ALL SlotLocks we just inserted
//      AND delete the Booking record.
//    - The window between "booking doc exists" and "all locks inserted" is
//      safe because availability queries read from SlotLock, not Booking.
//      A booking with no locks is invisible to the availability endpoint.
//

async function createBookingWithAtomicIndex(
    params: {
        roomId: string;
        date: string;
        startTime: string;
        endTime: string;
        bookedBy: { name: string; email: string };
        title: string;
        slots: string[];
    },
    res: Response
): Promise<void> {
    const { roomId, date, startTime, endTime, bookedBy, title, slots } = params;

    // Create the Booking record (not yet "visible" — no SlotLocks yet)
    const booking = await Booking.create({
        room: roomId,
        date,
        startTime,
        endTime,
        slots,
        bookedBy: { name: bookedBy.name.trim(), email: bookedBy.email.toLowerCase().trim() },
        title: title.trim(),
        status: 'confirmed',
    });

    const insertedLockIds: mongoose.Types.ObjectId[] = [];

    try {
        // Insert locks one at a time so we know exactly which ones succeeded
        for (const slotStart of slots) {
            const lock = await SlotLock.create({
                room: new mongoose.Types.ObjectId(roomId),
                date,
                slotStart,
                bookingId: booking._id,
            });
            insertedLockIds.push(lock._id as mongoose.Types.ObjectId);
        }
    } catch (err) {
        // Rollback: delete any locks we already inserted + the orphaned booking
        if (insertedLockIds.length > 0) {
            await SlotLock.deleteMany({ _id: { $in: insertedLockIds } });
        }
        await Booking.findByIdAndDelete(booking._id);

        const mongoErr = err as { code?: number };
        if (mongoErr.code === 11000) {
            throw new ConflictError(
                'One or more requested time slots are already booked. Please choose a different time or room.'
            );
        }
        throw err;
    }

    const populated = await Booking.findById(booking._id).populate(
        'room',
        'name location floor capacity'
    );
    successResponse(res, populated, 'Booking created successfully', 201);
}

//  GET /api/bookings?email=...

export async function getUserBookings(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { email } = req.query as { email?: string };

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ValidationError('Query parameter "email" must be a valid email address');
        }

        const bookings = await Booking.find({
            'bookedBy.email': email.toLowerCase().trim(),
        })
            .populate('room', 'name location floor capacity amenities')
            .sort({ date: 1, startTime: 1 });

        successResponse(res, bookings);
    } catch (err) {
        next(err);
    }
}

//  PATCH /api/bookings/:id/cancel
//
//  Refund window rule:
//    cancelled ≥ 2 hours before bookingStart → cancelled-refundable
//    cancelled < 2 hours before bookingStart → cancelled-non-refundable
//
//  The decision is made entirely on SERVER TIME — the client sends no timestamp.
//
//  On cancellation, SlotLock documents for this booking are deleted immediately,
//  freeing the slots for new bookings.
//

const REFUND_WINDOW_HOURS = 2;
const REFUND_WINDOW_MS = REFUND_WINDOW_HOURS * 60 * 60 * 1000;

export async function cancelBooking(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            throw new ValidationError('Invalid booking ID');
        }

        const booking = await Booking.findById(id).populate('room', 'name');
        if (!booking) {
            throw new NotFoundError('Booking');
        }

        // Already cancelled
        if (booking.status !== 'confirmed') {
            throw new BadRequestError(
                `This booking is already ${booking.status} and cannot be cancelled again.`
            );
        }

        // Compute refund status using SERVER clock
        const nowMs = Date.now(); // Server's current UTC time

        // booking.date is "YYYY-MM-DD", booking.startTime is "HH:MM"
        // Treat the booking time as UTC (consistent with slot generation)
        const bookingStartMs = new Date(
            `${booking.date}T${booking.startTime}:00.000Z`
        ).getTime();

        const msUntilStart = bookingStartMs - nowMs;

        const newStatus =
            msUntilStart >= REFUND_WINDOW_MS
                ? 'cancelled-refundable'
                : 'cancelled-non-refundable';

        // Update booking status
        booking.status = newStatus;
        await booking.save();

        // Free the slots immediately
        const deleteResult = await SlotLock.deleteMany({ bookingId: booking._id });

        const hoursUntilStart = msUntilStart / (1000 * 60 * 60);
        const isRefundable = newStatus === 'cancelled-refundable';

        successResponse(
            res,
            {
                booking: await Booking.findById(id).populate('room', 'name location floor'),
                refundable: isRefundable,
                hoursUntilStart: Math.max(0, parseFloat(hoursUntilStart.toFixed(2))),
                slotsFreed: deleteResult.deletedCount,
                message: isRefundable
                    ? `Booking cancelled with full refund (cancelled ${hoursUntilStart.toFixed(1)} hours before start).`
                    : `Booking cancelled without refund (cancelled less than ${REFUND_WINDOW_HOURS} hours before start).`,
            },
            isRefundable ? 'Cancelled with refund' : 'Cancelled without refund'
        );
    } catch (err) {
        next(err);
    }
}

//  GET /api/bookings/:id — Get a single booking
export async function getBookingById(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            throw new ValidationError('Invalid booking ID');
        }

        const booking = await Booking.findById(id).populate(
            'room',
            'name location floor capacity amenities'
        );
        if (!booking) {
            throw new NotFoundError('Booking');
        }

        successResponse(res, booking);
    } catch (err) {
        next(err);
    }
}