"use client";

import clsx from "clsx";
import { Slot } from '../../types';
import { formatTime } from '../../lib/dates';

interface Props {
    slots: Slot[];
    selectedStart: string | null;
    selectedEnd: string | null;   // exclusive — the end of the last selected slot
    onSlotClick: (slot: Slot) => void;
}

function isInSelection(
    slotStart: string,
    slotEnd: string,
    selectedStart: string | null,
    selectedEnd: string | null
): boolean {
    if (!selectedStart || !selectedEnd) return false;
    return slotStart >= selectedStart && slotEnd <= selectedEnd;
}

// Show hour labels only on the hour (minutes === "00")
function isHourBoundary(time: string): boolean {
    return time.endsWith(":00");
}

export default function SlotGrid({ slots, selectedStart, selectedEnd, onSlotClick }: Props) {
    return (
        <div className="space-y-0.5">
            {slots.map((slot) => {
                const selected = isInSelection(slot.start, slot.end, selectedStart, selectedEnd);
                const isHour = isHourBoundary(slot.start);

                return (
                    <div key={slot.start} className="flex items-center gap-3">
                        {/* Time label — only shown on the hour to reduce clutter */}
                        <div className="w-14 shrink-0 text-right">
                            {isHour ? (
                                <span className="text-[11px] font-medium text-slate-400 tabular">
                                    {formatTime(slot.start)}
                                </span>
                            ) : (
                                <span className="text-[10px] text-slate-300 tabular">
                                    {slot.start}
                                </span>
                            )}
                        </div>

                        {/* Slot cell */}
                        <div
                            role="button"
                            aria-label={
                                slot.available
                                    ? `${slot.start}–${slot.end} available`
                                    : `${slot.start}–${slot.end} booked by ${slot.bookedBy ?? "someone"}`
                            }
                            aria-pressed={selected}
                            tabIndex={slot.available ? 0 : -1}
                            onClick={() => onSlotClick(slot)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onSlotClick(slot);
                                }
                            }}
                            className={clsx(
                                "slot-cell flex-1 flex items-center justify-between px-3 h-9",
                                selected
                                    ? "slot-selected"
                                    : slot.available
                                        ? "slot-available"
                                        : "slot-booked"
                            )}
                        >
                            {slot.available ? (
                                selected ? (
                                    <span className="text-xs text-blue-700 font-medium">
                                        {slot.start} – {slot.end}
                                    </span>
                                ) : (
                                    <span className="text-xs text-slate-400">Available</span>
                                )
                            ) : (
                                <div className="flex items-center justify-between w-full gap-2 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <svg
                                            className="w-3 h-3 text-slate-400 shrink-0"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span className="text-xs text-slate-500 truncate">
                                            {slot.title ?? "Booked"}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 shrink-0">
                                        {slot.bookedBy}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}