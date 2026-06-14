import { Response } from 'express';

export function successResponse<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200
): void {
    res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}

export function errorResponse(
    res: Response,
    error: string,
    statusCode = 500,
    code?: string
): void {
    res.status(statusCode).json({
        success: false,
        error,
        code,
    });
}