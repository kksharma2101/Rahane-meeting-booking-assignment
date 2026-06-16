import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';

import roomRoutes from './routes/rooms.js';
import bookingRoutes from './routes/bookings.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { globalErrorHandler } from './lib/error.js';

const app = express();

// Security headers
// app.use(helmet());

// CORS — allow Next.js dev server and configured origins
app.use(
    cors({
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',')
            : ['https://rahane-meeting-booking-six.vercel.app', 'http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    })
);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}
app.use(requestLogger);

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});

// API routes
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        code: 'NOT_FOUND',
    });
});

// Global error handler (must be last)
app.use(globalErrorHandler);

export default app;
