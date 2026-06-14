import clsx from "clsx";
import { BookingStatus } from '../../types';

export default function StatusBadge({ status }: { status: BookingStatus }) {
    if (status === "confirmed") {
        return (
            <span className="badge badge-confirmed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Confirmed
            </span>
        );
    }
    if (status === "cancelled-refundable") {
        return (
            <span className="badge badge-refundable">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                Cancelled · Refundable
            </span>
        );
    }
    return (
        <span className="badge badge-nonrefundable">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            Cancelled · No Refund
        </span>
    );
}