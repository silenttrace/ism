import { Request, Response, NextFunction } from 'express';
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  ServiceUnavailableError,
  RateLimitError,
  errorHandler, 
  asyncHandler,
  notFoundHandler
} from '../errorHandler';

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn()
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn()
  }
}));

describe('Error Classes', () => {
  describe('AppError', () => {
    it('creates error with default values', () => {
      const error = new AppError('Test message');
      
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('creates error with custom values', () => {
      const error = new AppError('Custom message', 400, 'CUSTOM_ERROR', { detail: 'test' });
      
      expect(error.message).toBe('Custom message');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.details).toEqual({ detail: 'test' });
    });
  });

  describe('ValidationError', () => {
    it('creates validation error correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('NotFoundError', () => {
    it('creates not found error without id', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('creates not found error with id', () => {
      const error = new NotFoundError('User', '123');
      
      expect(error.message).toBe("User with id '123' not found");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('ServiceUnavailableError', () => {
    it('creates service unavailable error', () => {
      const error = new ServiceUnavailableError('AI Service', { reason: 'timeout' });
      
      expect(error.message).toBe('AI Service is currently unavailable');
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.details).toEqual({ reason: 'timeout' });
    });
  });

  describe('RateLimitError', () => {
    it('creates rate limit error', () => {
      const error = new RateLimitError(60);
      
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });
});

describe('asyncHandler', () => {
  it('handles successful async operations', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const req = {} as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    const handler = asyncHandler(mockFn);
    await handler(req, res, next);

    expect(mockFn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('handles async errors', async () => {
    const error = new Error('Async error');
    const mockFn = jest.fn().mockRejectedValue(error);
    const req = {} as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    const handler = asyncHandler(mockFn);
    await handler(req, res, next);

    expect(mockFn).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('errorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent')
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('handles AppError correctly', () => {
    const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'test' });

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Test error',
      code: 'TEST_ERROR',
      details: { field: 'test' }
    });
  });

  it('handles ValidationError by name', () => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';

    errorHandler(error as any, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: 'Validation failed'
    });
  });

  it('handles CastError', () => {
    const error = new Error('Cast failed');
    error.name = 'CastError';

    errorHandler(error as any, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid ID format',
      code: 'INVALID_ID'
    });
  });

  it('handles JWT errors', () => {
    const error = new Error('Invalid token');
    error.name = 'JsonWebTokenError';

    errorHandler(error as any, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  });

  it('handles Axios errors', () => {
    const error = {
      name: 'AxiosError',
      message: 'Network error',
      response: { status: 502, statusText: 'Bad Gateway' },
      config: { baseURL: 'https://api.example.com' }
    };

    errorHandler(error as any, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(502);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'External service error',
      code: 'EXTERNAL_API_ERROR',
      details: {
        service: 'https://api.example.com',
        status: 502,
        statusText: 'Bad Gateway'
      }
    });
  });

  it('handles unknown errors in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Unknown error');

    errorHandler(error as any, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Unknown error',
      code: 'INTERNAL_ERROR',
      stack: expect.any(String)
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('sanitizes errors in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Internal error details');

    errorHandler(error as any, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    });

    process.env.NODE_ENV = originalEnv;
  });
});

describe('notFoundHandler', () => {
  it('handles 404 routes correctly', () => {
    const mockReq = { originalUrl: '/nonexistent' } as Request;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;

    notFoundHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Route /nonexistent not found',
      code: 'ROUTE_NOT_FOUND'
    });
  });
});