/**
 * Seed script
 * Run: npm run seed
 *
 * Creates:
 *  • 4 rooms
 *  • Realistic mix of bookings:
 *    - Past bookings (already happened)
 *    - Current-day bookings starting in >2 hours (refundable)
 *    - Current-day bookings starting in <2 hours (non-refundable when cancelled)
 *    - Future bookings on upcoming days
 */
import 'dotenv/config';

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { Room } from '../models/room.model';
import { Booking, SlotLock } from '../models/booking.model';
import { getSlotsForRange } from '../utils/slots';

// Room definitions

const ROOMS = [
    {
        name: 'Boardroom Alpha',
        location: 'North Wing',
        floor: '4th Floor',
        capacity: 14,
        amenities: ['Projector', 'Whiteboard', 'Video Conferencing', 'Coffee Station'],
    },
    {
        name: 'Focus Room Beta',
        location: 'East Wing',
        floor: '2nd Floor',
        capacity: 4,
        amenities: ['Whiteboard', 'TV Screen', 'Soundproofed'],
    },
    {
        name: 'Innovation Lab Gamma',
        location: 'West Wing',
        floor: '3rd Floor',
        capacity: 20,
        amenities: ['Dual Projectors', 'Whiteboards x3', 'Video Conferencing', 'Standing Desks'],
    },
    {
        name: 'Huddle Space Delta',
        location: 'Central Hub',
        floor: '1st Floor',
        capacity: 6,
        amenities: ['TV Screen', 'Whiteboard'],
    },
];

// Date helpers (all UTC)

function todayStr(): string {
    return new Date().toISOString().split('T')[0];
}

function dateOffsetStr(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
}

/**
 * Current UTC hour, rounded to nearest 30-min boundary.
 * e.g. 10:45 UTC → "10:30"
 */
function currentSlot(): string {
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes() >= 30 ? 30 : 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + minutes;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Seed function

async function seed(): Promise<void> {
    await connectDB();
    console.log('\n🌱 Starting seed...\n');

    // Clear existing data
    await SlotLock.deleteMany({});
    await Booking.deleteMany({});
    await Room.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create rooms
    const rooms = await Room.insertMany(ROOMS);
    console.log(`✅ Created ${rooms.length} rooms`);

    const [alpha, beta, gamma, delta] = rooms;
    const today = todayStr();
    const tomorrow = dateOffsetStr(1);
    const dayAfter = dateOffsetStr(2);
    const yesterday = dateOffsetStr(-1);

    // Current time slots for refund-window testing
    const nowSlot = currentSlot();
    const in1h = addMinutes(nowSlot, 60);   // starts 1h from now  → NON-refundable
    const in1h30 = addMinutes(nowSlot, 90); // end of that booking
    const in3h = addMinutes(nowSlot, 180);  // starts 3h from now  → REFUNDABLE
    const in3h30 = addMinutes(nowSlot, 210);
    const in4h = addMinutes(nowSlot, 240);  // starts 4h from now  → REFUNDABLE
    const in5h = addMinutes(nowSlot, 300);

    // Define all bookings to seed
    interface BookingSeed {
        roomId: mongoose.Types.ObjectId;
        date: string;
        startTime: string;
        endTime: string;
        name: string;
        email: string;
        title: string;
        status: 'confirmed' | 'cancelled-refundable' | 'cancelled-non-refundable';
    }

    const bookingSeeds: BookingSeed[] = [
        // ── Today — within refund window (<2h) — NON-refundable if cancelled now ─
        {
            roomId: alpha._id as mongoose.Types.ObjectId,
            date: today,
            startTime: in1h,
            endTime: in1h30,
            name: 'Priya Sharma',
            email: 'priya.sharma@acmecorp.com',
            title: 'Urgent Client Call',
            status: 'confirmed',
        },
        // ── Today — outside refund window (>2h) — REFUNDABLE if cancelled now ────
        {
            roomId: beta._id as mongoose.Types.ObjectId,
            date: today,
            startTime: in3h,
            endTime: in3h30,
            name: 'James Okafor',
            email: 'james.okafor@acmecorp.com',
            title: 'Product Roadmap Review',
            status: 'confirmed',
        },
        {
            roomId: gamma._id as mongoose.Types.ObjectId,
            date: today,
            startTime: in4h,
            endTime: in5h,
            name: 'Mei-Lin Zhang',
            email: 'meilin.zhang@acmecorp.com',
            title: 'Engineering All-Hands',
            status: 'confirmed',
        },
        // ── Yesterday — past bookings ─────────────────────────────────────────────
        {
            roomId: alpha._id as mongoose.Types.ObjectId,
            date: yesterday,
            startTime: '09:00',
            endTime: '10:30',
            name: 'Arjun Patel',
            email: 'arjun.patel@acmecorp.com',
            title: 'Q2 Planning Session',
            status: 'confirmed',
        },
        {
            roomId: delta._id as mongoose.Types.ObjectId,
            date: yesterday,
            startTime: '14:00',
            endTime: '15:00',
            name: 'Priya Sharma',
            email: 'priya.sharma@acmecorp.com',
            title: 'Design Sync',
            status: 'cancelled-refundable',
        },
        // ── Tomorrow — future bookings ────────────────────────────────────────────
        {
            roomId: alpha._id as mongoose.Types.ObjectId,
            date: tomorrow,
            startTime: '09:00',
            endTime: '10:00',
            name: 'Arjun Patel',
            email: 'arjun.patel@acmecorp.com',
            title: 'Sprint Kickoff',
            status: 'confirmed',
        },
        {
            roomId: alpha._id as mongoose.Types.ObjectId,
            date: tomorrow,
            startTime: '11:00',
            endTime: '12:30',
            name: 'Sarah Mitchell',
            email: 'sarah.mitchell@acmecorp.com',
            title: 'Investor Presentation Prep',
            status: 'confirmed',
        },
        {
            roomId: beta._id as mongoose.Types.ObjectId,
            date: tomorrow,
            startTime: '13:00',
            endTime: '14:00',
            name: 'James Okafor',
            email: 'james.okafor@acmecorp.com',
            title: 'Frontend Architecture Review',
            status: 'confirmed',
        },
        {
            roomId: gamma._id as mongoose.Types.ObjectId,
            date: tomorrow,
            startTime: '15:00',
            endTime: '17:00',
            name: 'Mei-Lin Zhang',
            email: 'meilin.zhang@acmecorp.com',
            title: 'API Design Workshop',
            status: 'confirmed',
        },
        {
            roomId: delta._id as mongoose.Types.ObjectId,
            date: tomorrow,
            startTime: '10:00',
            endTime: '11:00',
            name: 'Priya Sharma',
            email: 'priya.sharma@acmecorp.com',
            title: 'UI Review Session',
            status: 'confirmed',
        },
        // Day after tomorrow
        {
            roomId: alpha._id as mongoose.Types.ObjectId,
            date: dayAfter,
            startTime: '09:30',
            endTime: '11:00',
            name: 'Sarah Mitchell',
            email: 'sarah.mitchell@acmecorp.com',
            title: 'Monthly Leadership Sync',
            status: 'confirmed',
        },
        {
            roomId: gamma._id as mongoose.Types.ObjectId,
            date: dayAfter,
            startTime: '14:00',
            endTime: '16:00',
            name: 'Arjun Patel',
            email: 'arjun.patel@acmecorp.com',
            title: 'New Engineer Onboarding',
            status: 'confirmed',
        },
        {
            roomId: beta._id as mongoose.Types.ObjectId,
            date: dayAfter,
            startTime: '11:00',
            endTime: '11:30',
            name: 'James Okafor',
            email: 'james.okafor@acmecorp.com',
            title: '1:1 with Manager',
            status: 'confirmed',
        },
    ];

    // Insert bookings and their SlotLocks
    let bookingCount = 0;
    let lockCount = 0;
    const skipped: string[] = [];

    for (const seed of bookingSeeds) {
        try {
            const slots = getSlotsForRange(seed.startTime, seed.endTime);

            const booking = await Booking.create({
                room: seed.roomId,
                date: seed.date,
                startTime: seed.startTime,
                endTime: seed.endTime,
                slots,
                bookedBy: { name: seed.name, email: seed.email },
                title: seed.title,
                status: seed.status,
            });

            // Only create SlotLocks for confirmed bookings
            if (seed.status === 'confirmed') {
                const lockDocs = slots.map((slotStart) => ({
                    room: seed.roomId,
                    date: seed.date,
                    slotStart,
                    bookingId: booking._id,
                }));

                try {
                    await SlotLock.insertMany(lockDocs, { ordered: true });
                    lockCount += lockDocs.length;
                } catch {
                    // If locks fail (e.g. time boundary issues in seed), skip gracefully
                    await Booking.findByIdAndDelete(booking._id);
                    skipped.push(`${seed.title} (lock conflict)`);
                    continue;
                }
            }

            bookingCount++;
        } catch (err) {
            skipped.push(`${seed.title}: ${(err as Error).message}`);
        }
    }

    console.log(`✅ Created ${bookingCount} bookings`);
    console.log(`✅ Created ${lockCount} slot locks`);

    if (skipped.length) {
        console.log(`⚠️  Skipped ${skipped.length} bookings (likely time boundary edge cases):`);
        skipped.forEach((s) => console.log(`   • ${s}`));
    }

    // Summary 
    console.log('\n─────────────────────────────────────────');
    console.log('📋 SEED SUMMARY');
    console.log('─────────────────────────────────────────');
    console.log(`Rooms created: ${rooms.map((r) => r.name).join(', ')}`);
    console.log(`\nBookings for REFUND WINDOW TESTING (today = ${today}):`);
    console.log(`  • Priya Sharma in Boardroom Alpha @ ${in1h}–${in1h30}`);
    console.log(`    → Cancel NOW = NON-REFUNDABLE (starts in ~1 hour)`);
    console.log(`  • James Okafor in Focus Room Beta @ ${in3h}–${in3h30}`);
    console.log(`    → Cancel NOW = REFUNDABLE (starts in ~3 hours)`);
    console.log(`  • Mei-Lin Zhang in Innovation Lab Gamma @ ${in4h}–${in5h}`);
    console.log(`    → Cancel NOW = REFUNDABLE (starts in ~4 hours)`);
    console.log('\n✨ Seed complete!\n');

    await disconnectDB();
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});