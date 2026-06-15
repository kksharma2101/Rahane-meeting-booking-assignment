"use client";

import { useState } from "react";
import { Booking } from '../../types';
import { cancelBooking, fetchUserBookings } from '../../api';
import { isBookingPast } from '../../lib/dates';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import BookingCard from './BookingCard';
import CancelModal from './CancelModal ';

type LoadState = "idle" | "loading" | "done" | "error";

export default function BookingsClient() {
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [loadState, setLoadState] = useState<LoadState>("idle");
    const [loadError, setLoadError] = useState("");
    const [bookings, setBookings] = useState<Booking[]>([]);

    // Cancel modal state
    const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState("");
    const [lastCancelMsg, setLastCancelMsg] = useState("");

    // Lookup
    const handleLookup = async () => {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError("Enter a valid email address");
            return;
        }
        setEmailError("");
        setLoadState("loading");
        setLoadError("");
        setLastCancelMsg("");
        try {
            const data = await fetchUserBookings(email.trim().toLowerCase());
            setBookings(data);
            setLoadState("done");
        } catch (e) {
            setLoadError((e as Error).message ?? "Failed to fetch bookings");
            setLoadState("error");
        }
    };

    // Cancel flow
    const handleCancelConfirm = async () => {
        if (!cancelTarget) return;
        setCancelling(true);
        setCancelError("");
        try {
            const result = await cancelBooking(cancelTarget._id);
            // Update local list
            setBookings((prev) =>
                prev.map((b) =>
                    b._id === cancelTarget._id ? result.booking : b
                )
            );
            setLastCancelMsg(result.message);
            setCancelTarget(null);
        } catch (e) {
            setCancelError((e as Error).message ?? "Cancellation failed");
        } finally {
            setCancelling(false);
        }
    };

    // Derived lists
    const upcoming = bookings.filter(
        (b) => b.status === "confirmed" && !isBookingPast(b.date, b.startTime)
    );
    const past = bookings.filter(
        (b) => b.status !== "confirmed" || isBookingPast(b.date, b.startTime)
    );

    return (
        <div className="space-y-8 max-w-3xl mt-12 lg:mt-0">
            {/* Header */}
            <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">
                    My Bookings
                </p>
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                    View &amp; manage your bookings
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Enter your email address to look up all bookings made under that address.
                </p>
            </div>

            {/* Email lookup */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <Input
                            label="Email address"
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (emailError) setEmailError("");
                            }}
                            error={emailError}
                            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                        />
                    </div>
                    <Button
                        onClick={handleLookup}
                        loading={loadState === "loading"}
                        className="mb-px"
                    >
                        Look up
                    </Button>
                </div>
            </div>

            {/* Load error */}
            {loadState === "error" && (
                <Alert kind="error" title="Could not load bookings" message={loadError} />
            )}

            {/* Cancel success */}
            {lastCancelMsg && (
                <Alert
                    kind="info"
                    message={lastCancelMsg}
                    onDismiss={() => setLastCancelMsg("")}
                />
            )}

            {/* Results */}
            {loadState === "done" && (
                <>
                    {bookings.length === 0 ? (
                        <div className="text-center py-14 text-slate-400">
                            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="font-medium text-sm">No bookings found</p>
                            <p className="text-xs mt-1">No bookings are associated with <strong>{email}</strong>.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Upcoming */}
                            {upcoming.length > 0 && (
                                <section className="space-y-3">
                                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                        Upcoming ({upcoming.length})
                                    </h2>
                                    <div className="space-y-3">
                                        {upcoming.map((b) => (
                                            <BookingCard
                                                key={b._id}
                                                booking={b}
                                                onCancel={() => {
                                                    setCancelTarget(b);
                                                    setCancelError("");
                                                }}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Past / cancelled */}
                            {past.length > 0 && (
                                <section className="space-y-3">
                                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                                        Past &amp; cancelled ({past.length})
                                    </h2>
                                    <div className="space-y-3 opacity-75">
                                        {past.map((b) => (
                                            <BookingCard key={b._id} booking={b} readOnly />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Cancel confirmation modal */}
            {cancelTarget && (
                <CancelModal
                    booking={cancelTarget}
                    loading={cancelling}
                    error={cancelError}
                    onConfirm={handleCancelConfirm}
                    onClose={() => {
                        setCancelTarget(null);
                        setCancelError("");
                    }}
                />
            )}
        </div>
    );
}