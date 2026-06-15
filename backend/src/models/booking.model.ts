import { Schema, model, Document, Types } from 'mongoose';
import { BookingStatus } from '../types/Index.js';

export interface IBookingDocument extends Document {
    room: Types.ObjectId;
    date: string;
    startTime: string;
    endTime: string;
    slots: string[];
    bookedBy: {
        name: string;
        email: string;
    };
    title: string;
    status: BookingStatus;
    createdAt: Date;
    updatedAt: Date;
}

const BookingSchema = new Schema<IBookingDocument>(
    {
        room: {
            type: Schema.Types.ObjectId,
            ref: 'Room',
            required: [true, 'Room reference is required'],
        },
        date: {
            type: String,
            required: [true, 'Date is required'],
            match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
        },
        startTime: {
            type: String,
            required: [true, 'Start time is required'],
            match: [/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'],
        },
        endTime: {
            type: String,
            required: [true, 'End time is required'],
            match: [/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'],
        },

        slots: {
            type: [String],
            required: [true, 'Slots are required'],
            validate: {
                validator: (v: string[]) => v.length > 0,
                message: 'At least one slot is required',
            },
        },
        bookedBy: {
            name: {
                type: String,
                required: [true, 'Booker name is required'],
                trim: true,
            },
            email: {
                type: String,
                required: [true, 'Booker email is required'],
                trim: true,
                lowercase: true,
                match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
            },
        },
        title: {
            type: String,
            required: [true, 'Booking title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        status: {
            type: String,
            enum: ['confirmed', 'cancelled-refundable', 'cancelled-non-refundable'],
            default: 'confirmed',
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes

// Fast lookup for availability queries
BookingSchema.index({ room: 1, date: 1, status: 1 });

// Fast lookup for user's own bookings
BookingSchema.index({ 'bookedBy.email': 1, createdAt: -1 });

export const Booking = model<IBookingDocument>('Booking', BookingSchema);

//  SlotLock — The actual concurrency guard
//
//  Each confirmed booking holds one SlotLock document per slot it occupies.
//  The UNIQUE INDEX on (room + date + slotStart) means that two concurrent
//  requests trying to insert the same slot will result in exactly one success
//  and one duplicate-key error (MongoDB error code 11000).
//
//  This is fundamentally different from "read → check → write":
//    • Read-then-write has a TOCTOU race condition — two requests can both
//      read "available", both pass the check, and both write.
//    • Unique index insertion is atomic at the storage engine level — only
//      one writer can win, guaranteed by WiredTiger's document-level locking.
//
//  Multi-slot requests:
//    We attempt to insert ALL slot locks inside a try/catch.
//    If ANY insert fails (duplicate key), we immediately delete the locks we
//    already inserted (rollback) and return 409 Conflict — so the booking
//    is all-or-nothing.
//
//  For MongoDB replica sets / Atlas we additionally wrap in a session
//  transaction so the rollback is atomic too.

export interface ISlotLockDocument extends Document {
    room: Types.ObjectId;
    date: string;
    slotStart: string;
    bookingId: Types.ObjectId;
    createdAt: Date;
}

const SlotLockSchema = new Schema<ISlotLockDocument>(
    {
        room: {
            type: Schema.Types.ObjectId,
            ref: 'Room',
            required: true,
        },
        date: {
            type: String,
            required: true,
        },
        slotStart: {
            type: String,
            required: true,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: 'Booking',
            required: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

/**
 * THE KEY CONSTRAINT:
 * A (room, date, slotStart) triple must be unique across all confirmed bookings.
 * MongoDB enforces this atomically — no application-level locking needed.
 */
SlotLockSchema.index(
    { room: 1, date: 1, slotStart: 1 },
    {
        unique: true,
        name: 'unique_room_date_slot',
        // Background build so the server can start while indexing large collections
        background: true,
    }
);

export const SlotLock = model<ISlotLockDocument>('SlotLock', SlotLockSchema);