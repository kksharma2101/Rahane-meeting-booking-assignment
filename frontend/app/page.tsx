import { fetchRooms } from '../api';
import RoomCard from '../components/rooms/RoomCard';
import { Room } from '../types';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RoomsPage() {
  let rooms: Room[] = [];
  let error: string | null = null;

  try {
    rooms = await fetchRooms();
  } catch (e) {
    error = (e as Error).message ?? "Failed to load rooms";
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">
            Meeting Rooms
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Choose a room to book
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            All rooms available 24/7 in 30-minute slots.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 border-l-2 border-emerald-500" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 border-l-2 border-slate-300" />
            Booked
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <strong>Could not load rooms.</strong> Make sure the backend is running on{" "}
          <code className="font-mono text-xs bg-red-100 px-1 py-0.5 rounded">
            http://localhost:1206
          </code>
          . Error: {error}
        </div>
      )}

      {/* Room grid */}
      {!error && rooms.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
          </svg>
          <p className="font-medium text-sm">No rooms found</p>
          <p className="text-xs mt-1">Run the seed script to populate rooms.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {rooms.map((room) => (
          <RoomCard key={room._id} room={room} />
        ))}
      </div>
    </div>
  );
}