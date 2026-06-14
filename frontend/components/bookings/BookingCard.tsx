"use client";

import clsx from "clsx";
import { Booking, Room } from '../../types';
import { formatDate, formatTime, isBookingPast, minutesUntilStart } from '../../lib/dates';
import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';

interface Props {
    booking: Booking;
    onCancel?: () => void;
    readOnly?: boolean;
}

export default function BookingCard({ booking, onCancel, readOnly }: Props) {
    const room = booking.room as Room;
    const isPast = isBookingPast(booking.date, booking.startTime);
    const isCancelled = booking.status !== "confirmed";
    const canCancel = !readOnly && !isPast && !isCancelled;

    // Refund warning: show if confirmed and < 2h until start
    const minsLeft = minutesUntilStart(booking.date, booking.startTime);
    const showRefundWarning = canCancel && minsLeft < 120 && minsLeft > 0;

    return (
        <div
            className={clsx(
                "bg-white border rounded-lg px-5 py-4 transition-all",
                isCancelled
                    ? "border-slate-200"
                    : isPast
                        ? "border-slate-200"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
            )}
        >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                {/* Left: info */}
                <div className="space-y-1.5 min-w-0">
                    {/* Title + status */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={clsx(
                            "font-semibold text-sm leading-tight",
                            isCancelled ? "text-slate-400 line-through" : "text-slate-900"
                        )}>
                            {booking.title}
                        </h3>
                        <StatusBadge status={booking.status} />
                    </div>

                    {/* Room */}
                    <p className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{room?.name ?? "—"}</span>
                        {room?.floor && <span> · {room.floor}</span>}
                        {room?.location && <span> · {room.location}</span>}
                    </p>

                    {/* Date + time */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 tabular">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatDate(booking.date)}</span>
                        <span className="text-slate-300">·</span>
                        <span className="font-medium text-slate-700">
                            {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span>{booking.slots.length * 30} min</span>
                    </div>

                    {/* Refund window warning */}
                    {showRefundWarning && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 inline-flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Cancelling now will be <strong>non-refundable</strong> (starts in {minsLeft} min)
                        </p>
                    )}
                </div>

                {/* Right: cancel button */}
                {canCancel && onCancel && (
                    <div className="shrink-0">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onCancel}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        >
                            Cancel
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}