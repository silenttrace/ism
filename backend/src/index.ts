import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createLogger, format, transports } from 'winston';
import controlRoutes from './routes/controlRoutes';
import mappingRoutes from './routes/mappingRoutes';
import reportRoutes from './routes/reportRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import requestLogger from './middleware/requestLogger';

const app = express();
const PORT = process.env.PORT || 3001;

// Logger setup
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'ism-nist-mapper-backend' },
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ],
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'ism-nist-mapper-backend'
  });
});

// Basic API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'ISM-NIST Mapper API',
    version: '1.0.0',
    description: 'Backend API for ISM to NIST 800-53 control mapping'
  });
});

// Control routes
app.use('/api/controls', controlRoutes);

// Mapping routes
app.use('/api/mappings', mappingRoutes);

// Report routes
app.use('/api/reports', reportRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Health check available at http://localhost:${PORT}/api/health`);
});

export default app;