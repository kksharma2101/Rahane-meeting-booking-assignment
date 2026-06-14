import { Types } from 'mongoose';

// Room

export interface IRoom {
    _id: Types.ObjectId;
    name: string;
    location: string;
    floor: string;
    capacity: number;
    amenities: string[];
    createdAt: Date;
    updatedAt: Date;
}

// Booking

export type BookingStatus =
    | 'confirmed'
    | 'cancelled-refundable'
    | 'cancelled-non-refundable';

export interface IBookedBy {
    name: string;
    email: string;
}

export interface IBooking {
    _id: Types.ObjectId;
    room: Types.ObjectId | IRoom;
    date: string;           // "YYYY-MM-DD" — stored as string for exact-match index
    startTime: string;      // "HH:MM" 24-hour
    endTime: string;        // "HH:MM" 24-hour
    slots: string[];        // ["09:00","09:30","10:00"] — each slot start time
    bookedBy: IBookedBy;
    title: string;
    status: BookingStatus;
    createdAt: Date;
    updatedAt: Date;
}

// Slot

export interface SlotInfo {
    start: string;          // "HH:MM"
    end: string;            // "HH:MM"
    available: boolean;
    bookingId?: string;
    bookedBy?: string;      // name only — not email for privacy
    title?: string;
}

// API Request bodies

export interface CreateBookingBody {
    roomId: string;
    date: string;           // "YYYY-MM-DD"
    startTime: string;      // "HH:MM"
    endTime: string;        // "HH:MM"
    bookedBy: IBookedBy;
    title: string;
}

// API Response shapes

export interface ApiSuccess<T> {
    success: true;
    data: T;
    message?: string;
}

export interface ApiError {
    success: false;
    error: string;
    code?: string;
}