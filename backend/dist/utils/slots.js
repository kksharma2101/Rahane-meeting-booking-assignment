/**
 * Slot utilities
 *
 * All times are "HH:MM" strings in 24-hour format.
 * A "slot" is a 30-minute window identified by its START time.
 * e.g. slot "09:00" covers 09:00–09:30.
 */
const SLOT_DURATION_MINUTES = 30;
/**
 * Convert "HH:MM" to total minutes since midnight.
 */
export function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}
/**
 * Convert total minutes since midnight to "HH:MM".
 */
export function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
/**
 * Generate all 30-minute slot start times for a full 24-hour day.
 * Returns 48 strings: ["00:00","00:30","01:00",...,"23:30"]
 */
export function generateDaySlots() {
    const slots = [];
    for (let m = 0; m < 24 * 60; m += SLOT_DURATION_MINUTES) {
        slots.push(minutesToTime(m));
    }
    return slots;
}
/**
 * Given a startTime and endTime, return all slot start-times covered.
 *
 * Example: startTime="09:00", endTime="10:30"
 * → ["09:00", "09:30", "10:00"]
 *
 * The endTime is exclusive (like Python ranges): the last slot starts at
 * endTime - 30 minutes.
 */
export function getSlotsForRange(startTime, endTime) {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (end <= start) {
        throw new Error('endTime must be after startTime');
    }
    if ((end - start) % SLOT_DURATION_MINUTES !== 0) {
        throw new Error(`Time range must be a multiple of ${SLOT_DURATION_MINUTES} minutes`);
    }
    const slots = [];
    for (let m = start; m < end; m += SLOT_DURATION_MINUTES) {
        slots.push(minutesToTime(m));
    }
    return slots;
}
/**
 * Validate that a time string is "HH:MM" and represents a valid 30-minute
 * boundary (i.e. minutes is 0 or 30).
 */
export function isValidSlotTime(time) {
    if (!/^\d{2}:\d{2}$/.test(time))
        return false;
    const [h, m] = time.split(':').map(Number);
    return h >= 0 && h <= 23 && (m === 0 || m === 30);
}
/**
 * Validate a YYYY-MM-DD date string.
 */
export function isValidDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        return false;
    const d = new Date(date + 'T00:00:00.000Z');
    return !isNaN(d.getTime());
}
/**
 * Given a date string (YYYY-MM-DD) and a time string (HH:MM),
 * return a Date object in UTC (treating the date+time as local/wall-clock).
 *
 * We deliberately use UTC math so the server timezone never affects results.
 */
export function toUtcDateTime(date, time) {
    return new Date(`${date}T${time}:00.000Z`);
}
/**
 * Compute the endTime string given startTime and a number of slots.
 */
export function computeEndTime(startTime, slotCount) {
    const startMinutes = timeToMinutes(startTime);
    return minutesToTime(startMinutes + slotCount * SLOT_DURATION_MINUTES);
}
