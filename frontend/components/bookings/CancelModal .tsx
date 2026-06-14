"use client";

import { useEffect } from "react";
import { Booking, Room } from '../../types';
import { formatDate, formatTime, minutesUntilStart } from '../../lib/dates';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

interface Props {
    booking: Booking;
    loading: boolean;
    error: string;
    onConfirm: () => void;
    onClose: () => void;
}

export default function CancelModal({ booking, loading, error, onConfirm, onClose }: Props) {
    const room = booking.room as Room;
    const minsLeft = minutesUntilStart(booking.date, booking.startTime);
    const willBeRefundable = minsLeft >= 120;

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-fade-in"
                onClick={onClose}
                aria-hidden
            />

            {/* Dialog */}
            <div
                role="dialog"
                aria-modal
                aria-labelledby="cancel-modal-title"
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 animate-slide-down"
            >
                {/* Header */}
                <div className="flex items-start gap-4 mb-5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${willBeRefundable ? "bg-amber-100" : "bg-red-100"
                        }`}>
                        <svg
                            className={`w-5 h-5 ${willBeRefundable ? "text-amber-600" : "text-red-600"}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h2 id="cancel-modal-title" className="text-base font-semibold text-slate-900">
                            Cancel booking?
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                            This action cannot be undone.
                        </p>
                    </div>
                </div>

                {/* Booking summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-5 space-y-1">
                    <p className="text-sm font-semibold text-slate-800">{booking.title}</p>
                    <p className="text-xs text-slate-500">{room?.name}</p>
                    <p className="text-xs text-slate-500 tabular">
                        {formatDate(booking.date)} · {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                    </p>
                </div>

                {/* Refund status prediction */}
                <div className={`rounded-lg px-4 py-3 mb-5 border text-sm ${willBeRefundable
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                    {willBeRefundable ? (
                        <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="font-semibold">Refundable cancellation</p>
                                <p className="text-xs mt-0.5 text-emerald-700">
                                    The booking starts in {Math.floor(minsLeft / 60)}h {minsLeft % 60}m —
                                    more than 2 hours away, so you qualify for a full refund.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="font-semibold">Non-refundable cancellation</p>
                                <p className="text-xs mt-0.5 text-red-700">
                                    {minsLeft > 0
                                        ? `The booking starts in ${minsLeft} minutes — less than 2 hours away.`
                                        : "This booking has already started or passed."}
                                    {" "}No refund will be issued.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* API error */}
                {error && <Alert kind="error" message={error} className="mb-4" />}

                {/* Refund rule note */}
                <p className="text-xs text-slate-400 mb-5">
                    Refund eligibility is determined by the server at the moment of cancellation.
                    The preview above is based on the current time.
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
                        Keep booking
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        loading={loading}
                        className="flex-1"
                    >
                        Yes, cancel
                    </Button>
                </div>
            </div>
        </>
    );
}