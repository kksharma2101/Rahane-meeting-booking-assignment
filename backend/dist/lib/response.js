export function successResponse(res, data, message, statusCode = 200) {
    res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}
export function errorResponse(res, error, statusCode = 500, code) {
    res.status(statusCode).json({
        success: false,
        error,
        code,
    });
}
