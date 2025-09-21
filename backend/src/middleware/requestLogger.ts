import { Request, Response, NextFunction } from 'express';
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'info',
  format: require('winston').format.combine(
    require('winston').format.timestamp(),
    require('winston').format.json()
  ),
  transports: [
    new (require('winston').transports.File)({ filename: 'combined.log' }),
    new (require('winston').transports.Console)({
      format: require('winston').format.combine(
        require('winston').format.colorize(),
        require('winston').format.simple()
      )
    })
  ]
});

export interface RequestLogData {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  ip: string;
  userAgent?: string;
  contentLength?: number;
  timestamp: string;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to log response
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    
    const logData: RequestLogData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : undefined,
      timestamp: new Date().toISOString()
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Server Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Client Error', logData);
    } else {
      logger.info('Request', logData);
    }

    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

export default requestLogger;