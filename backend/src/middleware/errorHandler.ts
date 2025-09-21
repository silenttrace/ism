import { Request, Response, NextFunction } from 'express';
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'error',
  format: require('winston').format.combine(
    require('winston').format.timestamp(),
    require('winston').format.errors({ stack: true }),
    require('winston').format.json()
  ),
  transports: [
    new (require('winston').transports.File)({ filename: 'error.log', level: 'error' }),
    new (require('winston').transports.Console)()
  ]
});

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public code: string;
  public details?: any;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string, details?: any) {
    super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let code = error.code || 'INTERNAL_ERROR';
  let details = error.details;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.message;
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid ID format';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token expired';
  }

  // Handle Axios errors (from external API calls)
  if (err.name === 'AxiosError') {
    const axiosError = err as any; // Type assertion for axios error
    statusCode = axiosError.response?.status || 502;
    code = 'EXTERNAL_API_ERROR';
    message = 'External service error';
    details = {
      service: axiosError.config?.baseURL,
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText
    };
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
    details = undefined;
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND'
  });
};

export default {
  AppError,
  ValidationError,
  NotFoundError,
  ServiceUnavailableError,
  RateLimitError,
  asyncHandler,
  errorHandler,
  notFoundHandler
};