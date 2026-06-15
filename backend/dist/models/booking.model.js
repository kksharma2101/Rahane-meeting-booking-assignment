import { Schema, model } from 'mongoose';
const BookingSchema = new Schema({
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
    /**
     * slots: array of slot-start times that this booking occupies.
     * e.g. a 09:00–10:30 booking → ["09:00", "09:30", "10:00"]
     *
     * The compound unique index on (room, date, slot) is the DATABASE-LEVEL
     * guard against double booking.  Each slot is stored as a separate document
     * in the SlotLock collection (see below) — a unique index violation from
     * MongoDB means the slot was taken, even under concurrent inserts.
     */
    slots: {
        type: [String],
        required: [true, 'Slots are required'],
        validate: {
            validator: (v) => v.length > 0,
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
// Fast lookup for availability queries
BookingSchema.index({ room: 1, date: 1, status: 1 });
// Fast lookup for user's own bookings
BookingSchema.index({ 'bookedBy.email': 1, createdAt: -1 });
export const Booking = model('Booking', BookingSchema);
const SlotLockSchema = new Schema({
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
}, { timestamps: { createdAt: true, updatedAt: false } });
/**
 * THE KEY CONSTRAINT:
 * A (room, date, slotStart) triple must be unique across all confirmed bookings.
 * MongoDB enforces this atomically — no application-level locking needed.
 */
SlotLockSchema.index({ room: 1, date: 1, slotStart: 1 }, {
    unique: true,
    name: 'unique_room_date_slot',
    // Background build so the server can start while indexing large collections
    background: true,
});
export const SlotLock = model('SlotLock', SlotLockSchema);
