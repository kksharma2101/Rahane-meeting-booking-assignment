import { ApiResponse, AvailabilityResponse, Booking, Room } from './types';


const API_BASE =
    typeof window === "undefined"
        ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1206")
        : "";

async function request<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const url = `${API_BASE}/api${path}`;
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });

    const json: ApiResponse<T> = await res.json();

    if (!json.success) {
        const err = new Error(json.error ?? "Request failed");
        (err as Error & { code?: string; status?: number }).code = json.code;
        (err as Error & { code?: string; status?: number }).status = res.status;
        throw err;
    }

    return (json as { success: true; data: T }).data;
}

// Rooms
export async function fetchRooms(): Promise<Room[]> {
    return request<Room[]>("/rooms");
}

export async function fetchRoomAvailability(
    roomId: string,
    date: string
): Promise<AvailabilityResponse> {
    return request<AvailabilityResponse>(
        `/rooms/${roomId}/availability?date=${date}`
    );
}

// Bookings

export interface CreateBookingPayload {
    roomId: string;
    date: string;
    startTime: string;
    endTime: string;
    bookedBy: { name: string; email: string };
    title: string;
}

export async function createBooking(
    payload: CreateBookingPayload
): Promise<Booking> {
    return request<Booking>("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function fetchUserBookings(email: string): Promise<Booking[]> {
    return request<Booking[]>(
        `/bookings?email=${encodeURIComponent(email)}`
    );
}

export async function cancelBooking(bookingId: string): Promise<{
    booking: Booking;
    refundable: boolean;
    hoursUntilStart: number;
    slotsFreed: number;
    message: string;
}> {
    return request(`/bookings/${bookingId}/cancel`, { method: "PATCH" });
}