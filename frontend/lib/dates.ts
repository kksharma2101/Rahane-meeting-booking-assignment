/**
 * Format "YYYY-MM-DD" → "Mon, 16 Jun 2025"
 */
export function formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
}

/**
 * Format "HH:MM" 24h → "9:00 AM"
 */
export function formatTime(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const period = h < 12 ? "AM" : "PM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Today as "YYYY-MM-DD" (UTC)
 */
export function todayISO(): string {
    return new Date().toISOString().split("T")[0];
}

/**
 * Date offset from today, as "YYYY-MM-DD"
 */
export function offsetDate(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split("T")[0];
}

/**
 * Is a date string in the past (before today UTC)?
 */
export function isDatePast(dateStr: string): boolean {
    return dateStr < todayISO();
}

/**
 * Is a booking in the past based on date + startTime (UTC)?
 */
export function isBookingPast(date: string, startTime: string): boolean {
    const bookingStart = new Date(`${date}T${startTime}:00.000Z`).getTime();
    return bookingStart < Date.now();
}

/**
 * Minutes until a booking starts (negative = already started/past)
 */
export function minutesUntilStart(date: string, startTime: string): number {
    const bookingStart = new Date(`${date}T${startTime}:00.000Z`).getTime();
    return Math.floor((bookingStart - Date.now()) / 60000);
}

/**
 * Compute endTime given startTime + number of 30-min slots
 */
export function computeEndTime(startTime: string, slotCount: number): string {
    const [h, m] = startTime.split(":").map(Number);
    const total = h * 60 + m + slotCount * 30;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Returns array of 7 consecutive date strings starting from offset
 */
export function weekDates(startOffset = 0): string[] {
    return Array.from({ length: 7 }, (_, i) => offsetDate(startOffset + i));
}