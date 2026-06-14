"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
    {
        href: "/",
        label: "Rooms",
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        href: "/bookings",
        label: "My Bookings",
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
];

export default function Sidebar() {
    const path = usePathname();

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-[240px] bg-white border-r border-slate-200 z-40">
                {/* Logo */}
                <div className="px-6 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <span className="font-semibold text-slate-900 tracking-tight">RoomBook</span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    <p className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                        Navigation
                    </p>
                    {NAV.map((item) => {
                        const active =
                            item.href === "/"
                                ? path === "/" || path.startsWith("/rooms")
                                : path.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    active
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <span className={active ? "text-blue-600" : "text-slate-400"}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer hint */}
                <div className="px-6 py-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Book rooms in 30-min slots. Cancel ≥2h before start for a refund.
                    </p>
                </div>
            </aside>

            {/* Mobile top bar */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-40 flex items-center px-4 gap-4">
                <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <span className="font-semibold text-slate-900 text-sm">RoomBook</span>
                <nav className="ml-auto flex items-center gap-1">
                    {NAV.map((item) => {
                        const active =
                            item.href === "/"
                                ? path === "/" || path.startsWith("/rooms")
                                : path.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium",
                                    active ? "bg-blue-50 text-blue-700" : "text-slate-600"
                                )}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            {/* Mobile spacer */}
            <div className="lg:hidden h-14" />
        </>
    );
}