import Link from "next/link";
import { Room } from '../../types';
import { todayISO } from '../../lib/dates';

export default function RoomCard({ room }: { room: Room }) {
    const today = todayISO();

    return (
        <div className="group bg-white border border-slate-200 rounded-lg p-5 hover:border-blue-200 hover:shadow-sm transition-all duration-150">
            {/* Room header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h2 className="font-semibold text-slate-900 text-base leading-tight group-hover:text-blue-700 transition-colors">
                        {room.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {room.floor} · {room.location}
                    </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs font-medium text-slate-600">{room.capacity}</span>
                </div>
            </div>

            {/* Amenities */}
            {room.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {room.amenities.map((a) => (
                        <span
                            key={a}
                            className="inline-block px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded"
                        >
                            {a}
                        </span>
                    ))}
                </div>
            )}

            {/* CTA */}
            <Link
                href={`/rooms/${room._id}?date=${today}`}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
                View availability
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </Link>
        </div>
    );
}