import { Request, Response, NextFunction } from 'express';

/**
 * Lightweight request logger that also stamps each request with a unique ID.
 * Useful for correlating concurrent requests during concurrency testing.
 */
export function requestLogger(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const start = Date.now();
    const requestId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Attach request ID for downstream use
    (req as Request & { requestId: string }).requestId = requestId;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const color =
            res.statusCode >= 500
                ? '\x1b[31m' // red
                : res.statusCode >= 400
                    ? '\x1b[33m' // yellow
                    : res.statusCode >= 200
                        ? '\x1b[32m' // green
                        : '\x1b[0m'; // reset

        console.log(
            `${color}[${requestId}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)\x1b[0m`
        );
    });

    next();
}