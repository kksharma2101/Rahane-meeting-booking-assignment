// Room

export interface Room {
    _id: string;
    name: string;
    location: string;
    floor: string;
    capacity: number;
    amenities: string[];
    createdAt: string;
}

// Slot

export interface Slot {
    start: string;   // "HH:MM"
    end: string;     // "HH:MM"
    available: boolean;
    bookingId?: string;
    bookedBy?: string;
    title?: string;
}

export interface AvailabilityResponse {
    room: {
        id: string;
        name: string;
        location: string;
        floor: string;
        capacity: number;
        amenities: string[];
    };
    date: string;
    slots: Slot[];
    summary: { total: number; available: number; booked: number };
}

// Booking

export type BookingStatus =
    | "confirmed"
    | "cancelled-refundable"
    | "cancelled-non-refundable";

export interface Booking {
    _id: string;
    room: Room | string;
    date: string;
    startTime: string;
    endTime: string;
    slots: string[];
    bookedBy: { name: string; email: string };
    title: string;
    status: BookingStatus;
    createdAt: string;
    updatedAt: string;
}

// API

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

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// UI helpers

export interface BookingFormValues {
    name: string;
    email: string;
    title: string;
}

export interface SelectedSlotRange {
    startTime: string;
    endTime: string;
    slotCount: number;
}