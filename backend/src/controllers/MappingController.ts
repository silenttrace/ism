import { Request, Response } from 'express';
import { MappingEngine } from '../services/MappingEngine';
import { OllamaService } from '../services/OllamaService';
import { createLogger } from 'winston';
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  ServiceUnavailableError,
  asyncHandler 
} from '../middleware/errorHandler';

const logger = createLogger({
  level: 'info',
  format: require('winston').format.json(),
  transports: [
    new (require('winston').transports.Console)()
  ]
});

export class MappingController {
  private mappingEngine: MappingEngine;
  private aiService: OllamaService | null = null;

  constructor() {
    this.mappingEngine = MappingEngine.getInstance();
    this.initializeAI();
  }

  /**
   * Initialize Ollama AI service
   */
  private initializeAI(): void {
    try {
      this.aiService = new OllamaService({
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'llama3.1'
      });

      this.mappingEngine.initialize(this.aiService as any);
      logger.info('Ollama AI service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Ollama service:', error);
      logger.warn('Make sure Ollama is installed and running: ollama serve');
    }
  }

  /**
   * Start processing ISM controls for mapping
   */
  startProcessing = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!this.aiService) {
      throw new ServiceUnavailableError('Ollama service', {
        message: 'Please ensure Ollama is running and properly configured'
      });
    }

    const { controlIds } = req.body;
    
    // Validate controlIds if provided
    if (controlIds && (!Array.isArray(controlIds) || controlIds.some(id => typeof id !== 'string'))) {
      throw new ValidationError('controlIds must be an array of strings', {
        provided: typeof controlIds,
        expected: 'string[]'
      });
    }

    const jobId = await this.mappingEngine.startProcessing(controlIds);

    res.json({
      success: true,
      data: {
        jobId,
        status: 'started',
        message: 'Processing started successfully'
      }
    });

    logger.info(`Started mapping processing job: ${jobId}`);
  });

  /**
   * Get processing job status
   */
  getJobStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { jobId } = req.params;
    
    if (!jobId) {
      throw new ValidationError('Job ID is required');
    }

    const job = this.mappingEngine.getJobStatus(jobId);
    
    if (!job) {
      throw new NotFoundError('Job', jobId);
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        totalControls: job.totalControls,
        processedControls: job.processedControls,
        startTime: job.startTime,
        endTime: job.endTime,
        error: job.error
      }
    });
  });

  /**
   * Get new results from queue
   */
  getNewResults = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { jobId } = req.params;
    
    const hasNewResults = this.mappingEngine.hasNewResults(jobId);
    const newResults = hasNewResults ? this.mappingEngine.getNewResults(jobId) : [];

    res.json({
      success: true,
      data: {
        hasNewResults,
        results: newResults,
        count: newResults.length
      }
    });
  });

  /**
   * Debug endpoint to see actual mapping counts
   */
  getDebugInfo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const allMappings = this.mappingEngine.getAllMappingResults();
    const queueSize = this.mappingEngine.hasNewResults() ? 'has results' : 'empty';
    
    res.json({
      success: true,
      data: {
        totalMappings: allMappings.length,
        queueStatus: queueSize,
        mappingIds: allMappings.map(m => m.ismControlId),
        firstMapping: allMappings[0] || null
      }
    });
  });

  /**
   * Get all mapping results
   */
  getAllMappings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const mappings = this.mappingEngine.getAllMappingResults();
    const metadata = this.mappingEngine.calculateProcessingMetadata();

    res.json({
      success: true,
      data: {
        mappings,
        metadata
      }
    });
  });

  /**
   * Get mapping for specific ISM control
   */
  async getMappingByControlId(req: Request, res: Response): Promise<void> {
    try {
      const { controlId } = req.params;
      
      if (!controlId) {
        res.status(400).json({
          success: false,
          error: 'Control ID is required'
        });
        return;
      }

      const mapping = this.mappingEngine.getMappingResult(controlId);
      
      if (!mapping) {
        res.status(404).json({
          success: false,
          error: `Mapping not found for control: ${controlId}`
        });
        return;
      }

      res.json({
        success: true,
        data: mapping
      });
    } catch (error) {
      logger.error('Failed to get mapping by control ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve mapping'
      });
    }
  }

  /**
   * Apply manual override to a mapping
   */
  applyManualOverride = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { controlId } = req.params;
    const { nistControlId, confidence, reasoning } = req.body;

    // Validation
    if (!controlId) {
      throw new ValidationError('Control ID is required');
    }

    if (!nistControlId || typeof nistControlId !== 'string') {
      throw new ValidationError('NIST control ID is required and must be a string', {
        provided: typeof nistControlId,
        expected: 'string'
      });
    }

    if (typeof confidence !== 'number' || confidence < 0 || confidence > 100) {
      throw new ValidationError('Confidence must be a number between 0 and 100', {
        provided: confidence,
        expected: 'number (0-100)'
      });
    }

    if (!reasoning || typeof reasoning !== 'string') {
      throw new ValidationError('Reasoning is required and must be a string', {
        provided: typeof reasoning,
        expected: 'string'
      });
    }

    this.mappingEngine.applyManualOverride(controlId, nistControlId, confidence, reasoning);

    res.json({
      success: true,
      message: 'Manual override applied successfully'
    });

    logger.info(`Applied manual override: ${controlId} -> ${nistControlId}`);
  });

  /**
   * Remove manual override
   */
  async removeManualOverride(req: Request, res: Response): Promise<void> {
    try {
      const { controlId, nistControlId } = req.params;

      if (!controlId || !nistControlId) {
        res.status(400).json({
          success: false,
          error: 'Both control ID and NIST control ID are required'
        });
        return;
      }

      this.mappingEngine.removeManualOverride(controlId, nistControlId);

      res.json({
        success: true,
        message: 'Manual override removed successfully'
      });

      logger.info(`Removed manual override: ${controlId} -> ${nistControlId}`);
    } catch (error) {
      logger.error('Failed to remove manual override:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove manual override'
      });
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = this.mappingEngine.getProcessingStats();
      const metadata = this.mappingEngine.calculateProcessingMetadata();

      res.json({
        success: true,
        data: {
          ...stats,
          metadata
        }
      });
    } catch (error) {
      logger.error('Failed to get processing stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get processing statistics'
      });
    }
  }

  /**
   * Get a preview of the prompt that would be sent to AI for a specific control
   */
  async getPromptPreview(req: Request, res: Response): Promise<void> {
    try {
      const { controlId } = req.params;
      
      if (!controlId) {
        res.status(400).json({
          success: false,
          error: 'Control ID is required'
        });
        return;
      }

      // Get the control service to fetch control data
      const { ControlService } = require('../services/ControlService');
      const controlService = ControlService.getInstance();
      
      const ismControl = controlService.getISMControlById(controlId);
      if (!ismControl) {
        res.status(404).json({
          success: false,
          error: `ISM control ${controlId} not found`
        });
        return;
      }

      const nistControls = controlService.getNISTControls();
      
      if (!this.aiService) {
        res.status(503).json({
          success: false,
          error: 'AI service not initialized'
        });
        return;
      }

      // Get the prompt that would be sent to AI
      const prompt = (this.aiService as any).buildMappingPrompt(ismControl, nistControls);

      res.json({
        success: true,
        data: {
          controlId,
          controlTitle: ismControl.title,
          promptLength: prompt.length,
          prompt: prompt
        }
      });

    } catch (error) {
      logger.error('Failed to get prompt preview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate prompt preview'
      });
    }
  }

  /**
   * Test AI service connection (OpenAI or Ollama)
   */
  async testAI(req: Request, res: Response): Promise<void> {
    try {
      if (!this.aiService) {
        res.status(503).json({
          success: false,
          error: 'Ollama service not initialized'
        });
        return;
      }

      const isConnected = await this.aiService.testConnection();
      const stats = this.aiService.getStats();

      res.json({
        success: true,
        data: {
          connected: isConnected,
          stats
        }
      });
    } catch (error) {
      logger.error('Failed to test AI service connection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test AI service connection'
      });
    }
  }

  /**
   * Reset all mappings and jobs
   */
  async resetMappings(req: Request, res: Response): Promise<void> {
    try {
      this.mappingEngine.reset();
      
      res.json({
        success: true,
        message: 'All mappings and jobs have been reset'
      });

      logger.info('Mapping engine reset via API');
    } catch (error) {
      logger.error('Failed to reset mappings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset mappings'
      });
    }
  }
}