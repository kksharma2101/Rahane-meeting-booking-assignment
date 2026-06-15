// Base application error — carries an HTTP status code.
export class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code ?? 'INTERNAL_ERROR';
        this.isOperational = true;
        // Restore prototype chain
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
export class NotFoundError extends AppError {
    constructor(resource) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}
export class ValidationError extends AppError {
    constructor(message) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}
export class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'BOOKING_CONFLICT');
    }
}
export class BadRequestError extends AppError {
    constructor(message) {
        super(message, 400, 'BAD_REQUEST');
    }
}
// Global error handler middleware
export function globalErrorHandler(err, _req, res, _next) {
    // Operational errors (our own AppError subclasses)
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
            code: err.code,
        });
        return;
    }
    // Mongoose duplicate key error (code 11000) — happens when a SlotLock insert
    // fails because that (room, date, slotStart) already exists.
    const mongoErr = err;
    if (mongoErr.code === 11000) {
        res.status(409).json({
            success: false,
            error: 'One or more requested slots are already booked. Please choose a different time.',
            code: 'BOOKING_CONFLICT',
            conflictedKey: mongoErr.keyValue,
        });
        return;
    }
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors ?? {}).map((e) => e.message);
        res.status(400).json({
            success: false,
            error: messages.join('; '),
            code: 'VALIDATION_ERROR',
        });
        return;
    }
    // Mongoose cast error (invalid ObjectId etc.)
    if (err.name === 'CastError') {
        res.status(400).json({
            success: false,
            error: 'Invalid ID format',
            code: 'INVALID_ID',
        });
        return;
    }
    // Unknown / unexpected errors — don't leak internals
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
    });
}
