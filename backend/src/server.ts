import 'dotenv/config';

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = parseInt(process.env.PORT ?? '1206', 10);

async function startServer(): Promise<void> {
    try {
        await connectDB();

        const server = app.listen(PORT, () => {
            console.log(`\n🚀 Meeting Room API running on http://localhost:${PORT}`);
        });

        // Graceful shutdown
        const shutdown = async (signal: string): Promise<void> => {
            console.log(`\n${signal} received — shutting down gracefully...`);
            server.close(async () => {
                const { disconnectDB } = await import('./config/db.js');
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