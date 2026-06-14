import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/db';

const PORT = parseInt(process.env.PORT ?? '5000', 10);

async function startServer(): Promise<void> {
    try {
        await connectDB();

        const server = app.listen(PORT, () => {
            console.log(`\n🚀 Meeting Room API running on http://localhost:${PORT}`);
            // console.log(`📋 Health check: http://localhost:${PORT}/health`);
            // console.log(`🏢 Rooms:        GET http://localhost:${PORT}/api/rooms`);
            // console.log(`📅 Bookings:     POST http://localhost:${PORT}/api/bookings`);
            // console.log(`\nEnvironment: ${process.env.NODE_ENV ?? 'development'}\n`);
        });

        // Graceful shutdown
        const shutdown = async (signal: string): Promise<void> => {
            console.log(`\n${signal} received — shutting down gracefully...`);
            server.close(async () => {
                const { disconnectDB } = await import('./config/db');
                await disconnectDB();
                console.log('Server closed.');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        // Unhandled promise rejections
        process.on('unhandledRejection', (reason: unknown) => {
            console.error('Unhandled Rejection:', reason);
            server.close(() => process.exit(1));
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();

//

// import "dotenv/config";
// import app from "./app";
// import { connectDB } from "./config/db";

// const port = process.env.PORT || 1206;

// const startServer = async () => {
//     await connectDB();

//     app.listen(port, () => {
//         console.log(
//             `Server running on port ${port}`
//         );
//     });
// };

// startServer();