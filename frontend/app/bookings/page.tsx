import type { Metadata } from "next";
import BookingsClient from '../../components/bookings/Bookingsclient ';

export const metadata: Metadata = {
    title: "My Bookings — RoomBook",
};

export default function BookingsPage() {
    return <BookingsClient />;
}