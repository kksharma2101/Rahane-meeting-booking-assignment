import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export default function Input({ label, error, hint, className, id, ...props }: Props) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label htmlFor={inputId} className="text-xs font-medium text-slate-700">
                    {label}
                    {props.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            <input
                id={inputId}
                className={clsx(
                    "w-full px-3 py-2 text-sm rounded-md border bg-white text-slate-900 placeholder-slate-400",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:border-blue-500",
                    "transition-colors",
                    error
                        ? "border-red-300 focus:ring-red-400"
                        : "border-slate-200 hover:border-slate-300",
                    props.disabled && "bg-slate-50 text-slate-500 cursor-not-allowed",
                    className
                )}
                {...props}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
    );
}