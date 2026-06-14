/**
 * Concurrency test
 * Run: npm run test:concurrency
 *
 * Fires N simultaneous POST /api/bookings requests for the SAME slot.
 * Expected result: exactly 1 succeeds (201), all others get 409 Conflict.
 *
 * This proves the unique-index guard works under real concurrent load.
 */

const API_BASE = process.env.API_BASE ?? 'http://localhost:5000';
const CONCURRENT_REQUESTS = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
    return new Date().toISOString().split('T')[0];
}

function tomorrowStr(): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split('T')[0];
}

interface BookingResult {
    index: number;
    status: number;
    body: Record<string, unknown>;
    duration: number;
}

async function bookSlot(
    index: number,
    roomId: string,
    date: string,
    startTime: string,
    endTime: string
): Promise<BookingResult> {
    const t0 = Date.now();
    const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            roomId,
            date,
            startTime,
            endTime,
            bookedBy: {
                name: `Concurrent User ${index}`,
                email: `concurrent.user${index}@test.com`,
            },
            title: `Concurrent Test Booking #${index}`,
        }),
    });

    const body = (await res.json()) as Record<string, unknown>;
    return { index, status: res.status, body, duration: Date.now() - t0 };
}

async function getRooms(): Promise<Array<{ _id: string; name: string }>> {
    const res = await fetch(`${API_BASE}/api/rooms`);
    const json = (await res.json()) as { data: Array<{ _id: string; name: string }> };
    return json.data;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function runConcurrencyTest(): Promise<void> {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║       CONCURRENCY DOUBLE-BOOKING TEST                ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    // ── 1. Health check ─────────────────────────────────────────────────────
    try {
        const health = await fetch(`${API_BASE}/health`);
        if (!health.ok) throw new Error('Server not healthy');
        console.log(`✅ Server is up: ${API_BASE}`);
    } catch {
        console.error(`❌ Server not reachable at ${API_BASE}`);
        console.error('   Start the server first: npm run dev');
        process.exit(1);
    }

    // ── 2. Get first room ────────────────────────────────────────────────────
    const rooms = await getRooms();
    if (!rooms.length) {
        console.error('❌ No rooms found. Run: npm run seed');
        process.exit(1);
    }
    const room = rooms[0];
    console.log(`🏢 Testing with room: ${room.name} (${room._id})`);

    // Use tomorrow so we don't conflict with seeded data
    const date = tomorrowStr();
    const startTime = '23:00'; // Late night — unlikely to be taken
    const endTime = '23:30';

    console.log(`📅 Target slot: ${date} ${startTime}–${endTime}`);
    console.log(`🔥 Firing ${CONCURRENT_REQUESTS} simultaneous requests...\n`);

    // ── 3. Fire all requests simultaneously ──────────────────────────────────
    const t0 = Date.now();
    const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
        bookSlot(i + 1, room._id, date, startTime, endTime)
    );

    // Promise.allSettled so we capture all results even if some throw
    const settled = await Promise.allSettled(promises);
    const totalTime = Date.now() - t0;

    const results: BookingResult[] = settled.map((s) => {
        if (s.status === 'fulfilled') return s.value;
        return {
            index: -1,
            status: 0,
            body: { error: (s as PromiseRejectedResult).reason },
            duration: 0,
        };
    });

    // ── 4. Analyse results ───────────────────────────────────────────────────
    const successes = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);
    const other = results.filter((r) => r.status !== 201 && r.status !== 409);

    console.log('─────────────────────────────────────────────────────────');
    console.log('RESULTS');
    console.log('─────────────────────────────────────────────────────────');

    results.forEach((r) => {
        const icon = r.status === 201 ? '✅' : r.status === 409 ? '🚫' : '⚠️ ';
        const statusLabel =
            r.status === 201 ? 'CREATED' : r.status === 409 ? 'CONFLICT' : `HTTP ${r.status}`;
        console.log(`${icon} Request #${r.index}: ${statusLabel} (${r.duration}ms)`);
        if (r.status === 409) {
            console.log(`   └─ ${(r.body as { error?: string }).error ?? 'conflict'}`);
        }
    });

    console.log('\n─────────────────────────────────────────────────────────');
    console.log('SUMMARY');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Total requests:     ${CONCURRENT_REQUESTS}`);
    console.log(`Successes (201):    ${successes.length}`);
    console.log(`Conflicts (409):    ${conflicts.length}`);
    console.log(`Other:              ${other.length}`);
    console.log(`Total time:         ${totalTime}ms`);

    console.log('\n─────────────────────────────────────────────────────────');
    if (successes.length === 1 && conflicts.length === CONCURRENT_REQUESTS - 1) {
        console.log('🎉 TEST PASSED: Exactly 1 booking succeeded, all others got 409');
        console.log('   The database-level unique index correctly prevented double-booking');
        console.log(
            `   Winning request: #${successes[0].index} (${successes[0].duration}ms)`
        );
    } else if (successes.length === 0) {
        console.log('⚠️  TEST INCONCLUSIVE: No requests succeeded');
        console.log('   The target slot may already be booked. Try a different time or re-seed.');
    } else if (successes.length > 1) {
        console.log(
            `❌ TEST FAILED: ${successes.length} requests succeeded for the same slot!`
        );
        console.log('   DOUBLE BOOKING DETECTED — the concurrency guard is not working!');
        process.exit(1);
    } else {
        console.log('⚠️  Unexpected result distribution. Check server logs.');
    }
    console.log('─────────────────────────────────────────────────────────\n');
}

runConcurrencyTest().catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
});