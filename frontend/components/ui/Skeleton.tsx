import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={clsx("animate-pulse rounded bg-slate-200", className)} />
    );
}

export function SlotGridSkeleton() {
    return (
        <div className="space-y-1">
            {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="flex gap-2 items-center">
                    <Skeleton className="w-14 h-5 shrink-0" />
                    <Skeleton className="flex-1 h-9" />
                </div>
            ))}
        </div>
    );
}

export function RoomCardSkeleton() {
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-9 w-full mt-2" />
        </div>
    );
}