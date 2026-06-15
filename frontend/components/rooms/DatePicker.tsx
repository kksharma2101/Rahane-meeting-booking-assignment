"use client";

import { useRef } from "react";
import clsx from "clsx";
import { todayISO, offsetDate, formatDate } from "../../lib/dates";

interface Props {
    value: string;       // "YYYY-MM-DD"
    onChange: (date: string) => void;
}

const DAYS = 14;

export default function DatePicker({ value, onChange }: Props) {
    const today = todayISO();
    const inputRef = useRef<HTMLInputElement>(null);

    const dates = Array.from({ length: DAYS }, (_, i) => offsetDate(i));

    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) onChange(e.target.value);
    };

    const isCustomDate = !dates.includes(value);

    return (
        <div className="space-y-3">
            <div className="flex gap-2 flex-wrap justify-center lg:justify-start overflow-x-auto pb-1 scrollbar-thin snap-x">
                {/* Quick-pick day buttons */}
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
                                "shrink-0 snap-start flex flex-col items-center px-3 py-2 rounded-md border text-center transition-all duration-100 min-w-13.5",
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

                {/* Divider */}
                <div className="shrink-0 flex items-center px-1">
                    <span className="h-10 w-px bg-slate-200" />
                </div>

                {/* Custom date picker button */}
                <div className="shrink-0 flex items-center">
                    <div
                        className={clsx(
                            "relative flex flex-col items-center justify-center px-3 py-2 rounded-md border cursor-pointer transition-all min-w-13.5 min-h-16.5",
                            isCustomDate
                                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50"
                        )}
                        onClick={() => inputRef.current?.showPicker()}
                    >
                        {/* Calendar icon */}
                        <svg
                            className="w-4 h-4 mb-0.5 pointer-events-none"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>

                        {/* Show the picked date if it's outside the quick-pick strip */}
                        {isCustomDate ? (
                            <>
                                <span className="text-[10px] font-semibold text-blue-100 pointer-events-none">
                                    {new Date(value + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" })}
                                </span>
                                <span className="text-[10px] text-blue-200 pointer-events-none">
                                    {new Date(value + "T00:00:00Z").toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}
                                </span>
                            </>
                        ) : (
                            <span className="text-[10px] font-medium pointer-events-none">Pick</span>
                        )}

                        {/* 
              The actual input — invisible but sits over the button area.
              opacity-0 + absolute fill means any click on the div hits it.
              showPicker() is the reliable cross-browser way to open it programmatically.
            */}
                        <input
                            ref={inputRef}
                            type="date"
                            value={value}
                            min={today}
                            onChange={handleNativeChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            aria-label="Pick a custom date"
                        />
                    </div>
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