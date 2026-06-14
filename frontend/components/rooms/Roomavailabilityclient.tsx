"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";
import { formatDate, formatTime, todayISO } from '../../lib/dates';
import { AvailabilityResponse, BookingFormValues, Slot } from '../../types';
import { createBooking, fetchRoomAvailability } from '../../api';
import Alert from '../ui/Alert';
import { SlotGridSkeleton } from '../ui/Skeleton';
import SlotGrid from '../bookings/SlotGrid';
import Button from '../ui/Button';
import Input from '../ui/Input';
import DatePicker from './DatePicker';

interface Props {
    roomId: string;
    initialDate?: string;
}

type Panel = "none" | "booking" | "success";

export default function RoomAvailabilityClient({ roomId, initialDate }: Props) {
    const today = todayISO();
    const [date, setDate] = useState(initialDate ?? today);
    const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // Selection state — a continuous range of available slots
    const [selectedStart, setSelectedStart] = useState<string | null>(null);
    const [selectedEnd, setSelectedEnd] = useState<string | null>(null);

    // Booking form
    const [panel, setPanel] = useState<Panel>("none");
    const [form, setForm] = useState<BookingFormValues>({ name: "", email: "", title: "" });
    const [formErrors, setFormErrors] = useState<Partial<BookingFormValues>>({});
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [successData, setSuccessData] = useState<{
        title: string; start: string; end: string;
    } | null>(null);

    // Load availability
    const load = useCallback(
        (d: string) => {
            startTransition(async () => {
                setLoadError(null);
                setSelectedStart(null);
                setSelectedEnd(null);
                setPanel("none");
                setBookingError(null);
                try {
                    const data = await fetchRoomAvailability(roomId, d);
                    setAvailability(data);
                } catch (e) {
                    setLoadError((e as Error).message ?? "Failed to load availability");
                    setAvailability(null);
                }
            });
        },
        [roomId]
    );

    // Initial load + reload when roomId changes
    useEffect(() => {
        load(date);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);

    const handleDateChange = (d: string) => {
        setDate(d);
        load(d);
    };

    // Slot selection logic
    const handleSlotClick = (slot: Slot) => {
        if (!slot.available) return;

        if (!selectedStart) {
            setSelectedStart(slot.start);
            setSelectedEnd(slot.end);
            setPanel("none");
            return;
        }

        // Clicking the already-selected single slot → deselect
        if (selectedStart === slot.start && selectedEnd === slot.end) {
            setSelectedStart(null);
            setSelectedEnd(null);
            setPanel("none");
            return;
        }

        const slots = availability?.slots ?? [];
        const startIdx = slots.findIndex((s) => s.start === selectedStart);
        const clickIdx = slots.findIndex((s) => s.start === slot.start);

        if (clickIdx < startIdx) {
            // Clicked before anchor — restart selection from here
            setSelectedStart(slot.start);
            setSelectedEnd(slot.end);
            setPanel("none");
            return;
        }

        // Check every slot between anchor and click is free
        const range = slots.slice(startIdx, clickIdx + 1);
        const allFree = range.every((s) => s.available);

        if (!allFree) {
            // Can't extend through a booked slot — restart
            setSelectedStart(slot.start);
            setSelectedEnd(slot.end);
            setPanel("none");
            return;
        }

        setSelectedEnd(slot.end);
        setPanel("none");
    };

    const clearSelection = () => {
        setSelectedStart(null);
        setSelectedEnd(null);
        setPanel("none");
        setBookingError(null);
    };

    const openBookingPanel = () => {
        setPanel("booking");
        setBookingError(null);
        setFormErrors({});
    };

    // Form validation
    const validateForm = (): boolean => {
        const errors: Partial<BookingFormValues> = {};
        if (!form.name.trim()) errors.name = "Your name is required";
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            errors.email = "A valid email is required";
        if (!form.title.trim()) errors.title = "A meeting title is required";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Submit booking
    const handleBook = async () => {
        if (!selectedStart || !selectedEnd || !availability) return;
        if (!validateForm()) return;

        setBookingLoading(true);
        setBookingError(null);
        try {
            await createBooking({
                roomId,
                date,
                startTime: selectedStart,
                endTime: selectedEnd,
                bookedBy: { name: form.name.trim(), email: form.email.trim().toLowerCase() },
                title: form.title.trim(),
            });

            // Refresh grid to reflect the new booking immediately
            const fresh = await fetchRoomAvailability(roomId, date);
            setAvailability(fresh);

            setSuccessData({ title: form.title, start: selectedStart, end: selectedEnd });
            setSelectedStart(null);
            setSelectedEnd(null);
            setPanel("success");
            setForm({ name: "", email: "", title: "" });
        } catch (e) {
            setBookingError((e as Error).message ?? "Booking failed");
        } finally {
            setBookingLoading(false);
        }
    };

    // Computed values
    const room = availability?.room;
    const slots = availability?.slots ?? [];
    const summary = availability?.summary;

    const slotCount = (() => {
        if (!selectedStart || !selectedEnd || !slots.length) return 0;
        const si = slots.findIndex((s) => s.start === selectedStart);
        const ei = slots.findIndex((s) => s.end === selectedEnd);
        return Math.max(0, ei - si + 1);
    })();

    const durationLabel =
        slotCount === 1 ? "30 min" : `${slotCount * 30} min (${slotCount} slots)`;

    return (
        <div className="space-y-6">
            {/* Back + header */}
            <div>
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors mb-4"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    All rooms
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">
                            Availability
                        </p>
                        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                            {room?.name ?? "Loading…"}
                        </h1>
                        {room && (
                            <p className="text-sm text-slate-500 mt-0.5">
                                {room.floor} · {room.location} · up to {room.capacity} people
                            </p>
                        )}
                    </div>

                    {summary && (
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>
                                <span className="font-semibold text-emerald-600">{summary.available}</span> free
                            </span>
                            <span className="text-slate-300">·</span>
                            <span>
                                <span className="font-semibold text-slate-700">{summary.booked}</span> booked
                            </span>
                            <span className="text-slate-300">·</span>
                            <span>{summary.total} total</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Date picker */}
            <DatePicker value={date} onChange={handleDateChange} />

            {/* Load error */}
            {loadError && (
                <Alert kind="error" message={loadError} title="Failed to load availability" />
            )}

            {/* Success flash */}
            {panel === "success" && successData && (
                <Alert
                    kind="success"
                    title="Booking confirmed!"
                    message={`"${successData.title}" booked for ${formatTime(successData.start)} – ${formatTime(successData.end)} on ${formatDate(date)}.`}
                    onDismiss={() => setPanel("none")}
                />
            )}

            {/* Main layout */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
                {/* Slot grid */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                        <p className="text-sm font-medium text-slate-700">{formatDate(date)}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 border-l-2 border-emerald-400 bg-emerald-50 inline-block rounded-sm" />
                                Available
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 border-l-2 border-blue-500 bg-blue-50 inline-block rounded-sm" />
                                Selected
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 border-l-2 border-slate-300 bg-slate-100 inline-block rounded-sm" />
                                Booked
                            </span>
                        </div>
                    </div>

                    <div className="p-4">
                        {isPending || (!availability && !loadError) ? (
                            <SlotGridSkeleton />
                        ) : slots.length > 0 ? (
                            <SlotGrid
                                slots={slots}
                                selectedStart={selectedStart}
                                selectedEnd={selectedEnd}
                                onSlotClick={handleSlotClick}
                            />
                        ) : null}
                    </div>
                </div>

                {/* Right panel */}
                <div className="space-y-4">
                    {/* Selection summary */}
                    <div className={clsx(
                        "bg-white border rounded-lg p-4 transition-all",
                        selectedStart ? "border-blue-200" : "border-slate-200"
                    )}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            Selected time
                        </p>

                        {selectedStart && selectedEnd ? (
                            <div className="space-y-3">
                                <div className="tabular">
                                    <p className="text-lg font-semibold text-slate-900">
                                        {formatTime(selectedStart)} – {formatTime(selectedEnd)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">{durationLabel}</p>
                                </div>

                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={clearSelection} className="text-slate-500">
                                        Clear
                                    </Button>
                                    {panel !== "booking" && (
                                        <Button size="sm" onClick={openBookingPanel} className="flex-1">
                                            Book this slot
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">
                                Click a green slot to select it. Click another to extend the range.
                            </p>
                        )}
                    </div>

                    {/* Booking form */}
                    {panel === "booking" && selectedStart && selectedEnd && (
                        <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-4 animate-slide-down">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Booking details
                                </p>
                                <button
                                    onClick={() => setPanel("none")}
                                    className="text-slate-400 hover:text-slate-700 transition-colors"
                                    aria-label="Close"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="bg-slate-50 rounded px-3 py-2 text-xs tabular">
                                <span className="text-slate-500">Booking for </span>
                                <span className="font-semibold text-slate-800">
                                    {formatTime(selectedStart)} – {formatTime(selectedEnd)}
                                </span>
                                <span className="text-slate-400 ml-1">({durationLabel})</span>
                            </div>

                            <div className="space-y-3">
                                <Input
                                    label="Your name"
                                    placeholder="Jane Smith"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    error={formErrors.name}
                                />
                                <Input
                                    label="Email address"
                                    type="email"
                                    placeholder="jane@company.com"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                    error={formErrors.email}
                                    hint="Used to retrieve your bookings later"
                                />
                                <Input
                                    label="Meeting title"
                                    placeholder="e.g. Product Design Review"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                    error={formErrors.title}
                                />
                            </div>

                            {bookingError && <Alert kind="error" message={bookingError} />}

                            <Button onClick={handleBook} loading={bookingLoading} className="w-full">
                                Confirm booking
                            </Button>
                        </div>
                    )}

                    {/* Room amenities */}
                    {room?.amenities && room.amenities.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Amenities
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {room.amenities.map((a) => (
                                    <span key={a} className="text-xs px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded">
                                        {a}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cancellation policy */}
                    <div className="border border-amber-100 rounded-lg p-4 bg-amber-50">
                        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">
                            Cancellation policy
                        </p>
                        <p className="text-xs text-amber-700 leading-relaxed">
                            Cancel <strong>≥2 hours</strong> before the booking starts for a full refund.
                            Cancellations within 2 hours are non-refundable.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}