"use client";

import clsx from "clsx";
import { formatDate, offsetDate, todayISO } from '../../lib/dates';

interface Props {
    value: string;       // "YYYY-MM-DD"
    onChange: (date: string) => void;
}

const DAYS = 14; // show 2 weeks of quick-pick buttons

export default function DatePicker({ value, onChange }: Props) {
    const today = todayISO();

    // Build quick-pick dates: today + next 13 days
    const dates = Array.from({ length: DAYS }, (_, i) => offsetDate(i));

    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) onChange(e.target.value);
    };

    return (
        <div className="space-y-3">
            {/* Scrollable quick-pick strip */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin snap-x">
                {dates.map((d) => {
                    const date = new Date(d + "T00:00:00Z");
                    const dayName = date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
                    const dayNum = date.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" });
                    const month = date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
                    const isToday = d === today;
                    const isSelected = d === value;

                    return (
                        <button
                            key={d}
                            onClick={() => onChange(d)}
                            className={clsx(
                                "shrink-0 snap-start flex flex-col items-center px-3 py-2 rounded-md border text-center transition-all duration-100 min-w-[54px]",
                                isSelected
                                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                    : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                            )}
                        >
                            <span className={clsx(
                                "text-[10px] font-medium uppercase tracking-wide",
                                isSelected ? "text-blue-100" : isToday ? "text-blue-600" : "text-slate-400"
                            )}>
                                {isToday ? "Today" : dayName}
                            </span>
                            <span className={clsx(
                                "text-base font-semibold leading-tight",
                                isSelected ? "text-white" : "text-slate-900"
                            )}>
                                {dayNum}
                            </span>
                            <span className={clsx(
                                "text-[10px]",
                                isSelected ? "text-blue-100" : "text-slate-400"
                            )}>
                                {month}
                            </span>
                        </button>
                    );
                })}

                {/* Divider + native date input for arbitrary dates */}
                <div className="shrink-0 flex items-center px-1">
                    <span className="h-10 w-px bg-slate-200" />
                </div>
                <div className="shrink-0 flex flex-col items-center justify-center">
                    <label
                        htmlFor="custom-date"
                        className={clsx(
                            "flex flex-col items-center px-3 py-2 rounded-md border cursor-pointer transition-all min-w-13.5",
                            !dates.includes(value)
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50"
                        )}
                    >
                        <svg
                            className="w-4 h-4 mb-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] font-medium">Pick</span>
                        <input
                            id="custom-date"
                            type="date"
                            value={value}
                            min={today}
                            onChange={handleNativeChange}
                            className="sr-only"
                        />
                    </label>
                </div>
            </div>

            {/* Selected date label */}
            <p className="text-xs text-slate-500">
                Showing availability for{" "}
                <span className="font-medium text-slate-700">{formatDate(value)}</span>
            </p>
        </div>
    );
}