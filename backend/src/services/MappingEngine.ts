import { createLogger } from 'winston';
import { ISMControl, NISTControl } from '../models/Control';
import { OllamaService, MappingAnalysisResult, ControlMapping } from './OllamaService';
import { ControlService } from './ControlService';

const logger = createLogger({
  level: 'info',
  format: require('winston').format.json(),
  transports: [
    new (require('winston').transports.Console)()
  ]
});

export interface MappingResult {
  ismControlId: string;
  nistMappings: Array<{
    nistControlId: string;
    nistTitle: string;
    nistDescription: string;
    confidence: number;
    reasoning: string;
    isManualOverride: boolean;
  }>;
  processingTimestamp: Date;
  aiModel: string;
  processingTime: number;
}

export interface ProcessingJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalControls: number;
  processedControls: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  results: Map<string, MappingResult>;
}

export interface ProcessingMetadata {
  totalISMControls: number;
  processedControls: number;
  averageConfidence: number;
  highConfidenceMappings: number; // confidence >= 70%
  unmappedControls: number;
  processingStartTime: Date;
  processingEndTime?: Date;
  totalProcessingTime: number;
}

export class MappingEngine {
  private static instance: MappingEngine;
  private aiService: OllamaService | null = null;
  private controlService: ControlService;
  private activeJobs: Map<string, ProcessingJob> = new Map();
  private mappingResults: Map<string, MappingResult> = new Map();
  private resultsQueue: Array<{ jobId: string; result: MappingResult; timestamp: Date }> = [];

  private constructor() {
    this.controlService = ControlService.getInstance();
  }

  public static getInstance(): MappingEngine {
    if (!MappingEngine.instance) {
      MappingEngine.instance = new MappingEngine();
    }
    return MappingEngine.instance;
  }

  /**
   * Initialize the mapping engine with Ollama service
   */
  initialize(aiService: OllamaService): void {
    this.aiService = aiService;
    logger.info('Mapping engine initialized with Ollama service');
  }

  /**
   * Get NIST control metadata by ID
   */
  private getNISTControlMetadata(nistControlId: string): { title: string; description: string } {
    const nistControls = this.controlService.getNISTControls();
    console.log(`Looking for NIST control: ${nistControlId}`);
    console.log(`Available NIST controls: ${nistControls.length}`);
    
    if (nistControls.length > 0) {
      console.log(`First few NIST control IDs: ${nistControls.slice(0, 10).map(c => c.id).join(', ')}`);
      // Check if there are any AC controls
      const acControls = nistControls.filter(c => c.id.startsWith('AC-')).slice(0, 5);
      console.log(`AC controls found: ${acControls.map(c => c.id).join(', ')}`);
    }
    
    const nistControl = nistControls.find(control => 
      control.id.toLowerCase() === nistControlId.toLowerCase()
    );
    console.log(`Found NIST control: ${nistControl ? nistControl.title : 'NOT FOUND'}`);
    
    return {
      title: nistControl?.title || 'Unknown',
      description: nistControl?.description || 'Description not available'
    };
  }

  /**
   * Start processing all ISM controls
   */
  async startProcessing(controlIds?: string[]): Promise<string> {
    if (!this.aiService) {
      throw new Error('Ollama service not initialized');
    }

    if (!this.controlService.isReady()) {
      throw new Error('Control service not ready. Please load controls first.');
    }

    const jobId = this.generateJobId();
    const ismControls = controlIds 
      ? controlIds.map(id => this.controlService.getISMControlById(id)).filter(Boolean) as ISMControl[]
      : this.controlService.getISMControls();
    
    const nistControls = this.controlService.getNISTControls();

    if (ismControls.length === 0) {
      throw new Error('No ISM controls found to process');
    }

    if (nistControls.length === 0) {
      throw new Error('No NIST controls loaded for mapping reference');
    }

    const job: ProcessingJob = {
      id: jobId,
      status: 'queued',
      progress: 0,
      totalControls: ismControls.length,
      processedControls: 0,
      startTime: new Date(),
      results: new Map()
    };

    this.activeJobs.set(jobId, job);
    logger.info(`Started processing job ${jobId} with ${ismControls.length} ISM controls`);

    // Start processing asynchronously
    this.processControlsAsync(job, ismControls, nistControls);

    return jobId;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ProcessingJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get new results from queue and clear them
   */
  getNewResults(jobId?: string): Array<{ jobId: string; result: MappingResult; timestamp: Date }> {
    if (jobId) {
      // Get results for specific job
      const jobResults = this.resultsQueue.filter(item => item.jobId === jobId);
      // Remove these results from queue
      this.resultsQueue = this.resultsQueue.filter(item => item.jobId !== jobId);
      return jobResults;
    } else {
      // Get all results and clear queue
      const allResults = [...this.resultsQueue];
      this.resultsQueue = [];
      return allResults;
    }
  }

  /**
   * Check if there are new results available
   */
  hasNewResults(jobId?: string): boolean {
    if (jobId) {
      return this.resultsQueue.some(item => item.jobId === jobId);
    }
    return this.resultsQueue.length > 0;
  }

  /**
   * Get all mapping results with enriched NIST metadata
   */
  getAllMappingResults(): MappingResult[] {
    const results = Array.from(this.mappingResults.values());
    
    // Enrich existing mappings that might not have NIST metadata
    return results.map(result => ({
      ...result,
      nistMappings: result.nistMappings.map(mapping => {
        // If mapping already has title and description, keep them
        if (mapping.nistTitle && mapping.nistDescription) {
          return mapping;
        }
        
        // Otherwise, enrich with NIST metadata
        const nistMetadata = this.getNISTControlMetadata(mapping.nistControlId);
        return {
          ...mapping,
          nistTitle: nistMetadata.title,
          nistDescription: nistMetadata.description
        };
      })
    }));
  }

  /**
   * Get mapping result for specific ISM control with enriched NIST metadata
   */
  getMappingResult(ismControlId: string): MappingResult | null {
    const result = this.mappingResults.get(ismControlId);
    if (!result) return null;
    
    // Enrich with NIST metadata if missing
    return {
      ...result,
      nistMappings: result.nistMappings.map(mapping => {
        // If mapping already has title and description, keep them
        if (mapping.nistTitle && mapping.nistDescription) {
          return mapping;
        }
        
        // Otherwise, enrich with NIST metadata
        const nistMetadata = this.getNISTControlMetadata(mapping.nistControlId);
        return {
          ...mapping,
          nistTitle: nistMetadata.title,
          nistDescription: nistMetadata.description
        };
      })
    };
  }

  /**
   * Apply manual override to a mapping
   */
  applyManualOverride(
    ismControlId: string,
    nistControlId: string,
    confidence: number,
    reasoning: string
  ): void {
    const existingResult = this.mappingResults.get(ismControlId);
    
    const nistMetadata = this.getNISTControlMetadata(nistControlId);
    
    if (!existingResult) {
      // Create new result with manual override
      const newResult: MappingResult = {
        ismControlId,
        nistMappings: [{
          nistControlId,
          nistTitle: nistMetadata.title,
          nistDescription: nistMetadata.description,
          confidence,
          reasoning,
          isManualOverride: true
        }],
        processingTimestamp: new Date(),
        aiModel: 'manual-override',
        processingTime: 0
      };
      this.mappingResults.set(ismControlId, newResult);
    } else {
      // Update existing result
      const existingMapping = existingResult.nistMappings.find(m => m.nistControlId === nistControlId);
      
      if (existingMapping) {
        existingMapping.confidence = confidence;
        existingMapping.reasoning = reasoning;
        existingMapping.isManualOverride = true;
        existingMapping.nistTitle = nistMetadata.title;
        existingMapping.nistDescription = nistMetadata.description;
      } else {
        existingResult.nistMappings.push({
          nistControlId,
          nistTitle: nistMetadata.title,
          nistDescription: nistMetadata.description,
          confidence,
          reasoning,
          isManualOverride: true
        });
      }
    }

    logger.info(`Applied manual override for ${ismControlId} -> ${nistControlId}`);
  }

  /**
   * Remove manual override
   */
  removeManualOverride(ismControlId: string, nistControlId: string): void {
    const result = this.mappingResults.get(ismControlId);
    if (result) {
      result.nistMappings = result.nistMappings.filter(
        m => !(m.nistControlId === nistControlId && m.isManualOverride)
      );
      logger.info(`Removed manual override for ${ismControlId} -> ${nistControlId}`);
    }
  }

  /**
   * Calculate processing metadata
   */
  calculateProcessingMetadata(): ProcessingMetadata {
    const results = Array.from(this.mappingResults.values());
    const totalControls = this.controlService.getISMControls().length;
    
    let totalConfidence = 0;
    let mappingCount = 0;
    let highConfidenceCount = 0;
    let earliestStart = new Date();
    let latestEnd = new Date(0);
    let totalProcessingTime = 0;

    for (const result of results) {
      if (result.processingTimestamp < earliestStart) {
        earliestStart = result.processingTimestamp;
      }
      if (result.processingTimestamp > latestEnd) {
        latestEnd = result.processingTimestamp;
      }
      totalProcessingTime += result.processingTime;

      for (const mapping of result.nistMappings) {
        totalConfidence += mapping.confidence;
        mappingCount++;
        if (mapping.confidence >= 70) {
          highConfidenceCount++;
        }
      }
    }

    return {
      totalISMControls: totalControls,
      processedControls: results.length,
      averageConfidence: mappingCount > 0 ? totalConfidence / mappingCount : 0,
      highConfidenceMappings: highConfidenceCount,
      unmappedControls: totalControls - results.length,
      processingStartTime: earliestStart,
      processingEndTime: latestEnd > new Date(0) ? latestEnd : undefined,
      totalProcessingTime
    };
  }

  /**
   * Process controls asynchronously
   */
  private async processControlsAsync(
    job: ProcessingJob,
    ismControls: ISMControl[],
    nistControls: NISTControl[]
  ): Promise<void> {
    job.status = 'processing';
    logger.info(`Job ${job.id} started processing ${ismControls.length} ISM controls with Ollama AI`);
    logger.info(`DEBUG: ISM controls being processed: ${ismControls.map(c => c.id).slice(0, 5).join(', ')}${ismControls.length > 5 ? '...' : ''}`);
    
    try {
      if (!this.aiService) {
        throw new Error('Ollama service not available');
      }

      const results = await this.aiService.batchAnalyzeControls(
        ismControls,
        nistControls,
        (completed, total, latestResult) => {
          job.processedControls = completed;
          job.progress = Math.round((completed / total) * 100);
          logger.info(`Job ${job.id} progress: ${completed}/${total} (${job.progress}%) - Processing with Ollama AI`);
          
          // Update results in real-time as each control completes
          if (latestResult) {
            const [controlId, analysisResult] = latestResult;
            const mappingResult: MappingResult = {
              ismControlId: controlId,
              nistMappings: analysisResult.mappings.map(mapping => {
                const nistMetadata = this.getNISTControlMetadata(mapping.nistControlId);
                return {
                  ...mapping,
                  nistTitle: nistMetadata.title,
                  nistDescription: nistMetadata.description,
                  isManualOverride: false
                };
              }),
              processingTimestamp: analysisResult.timestamp,
              aiModel: analysisResult.model,
              processingTime: analysisResult.processingTime
            };

            // Update both stores immediately
            this.mappingResults.set(controlId, mappingResult);
            job.results.set(controlId, mappingResult);
            
            // Add to results queue for frontend consumption
            this.resultsQueue.push({
              jobId: job.id,
              result: mappingResult,
              timestamp: new Date()
            });
          }
        }
      );

      // Results are already updated in real-time via progress callback
      // No need to process them again here

      job.status = 'completed';
      job.endTime = new Date();
      job.progress = 100;

      logger.info(`Job ${job.id} completed successfully. Processed ${results.size} controls.`);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date();

      logger.error(`Job ${job.id} failed:`, error);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate confidence score based on multiple factors
   */
  calculateConfidenceScore(mapping: ControlMapping): number {
    // For now, use the AI-provided confidence
    // In the future, this could incorporate additional factors like:
    // - Semantic similarity scores
    // - Control family alignment
    // - Implementation complexity matching
    // - Historical validation data
    
    return Math.max(0, Math.min(100, mapping.confidence));
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalMappings: number;
  } {
    const jobs = Array.from(this.activeJobs.values());
    
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'processing' || j.status === 'queued').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      totalMappings: this.mappingResults.size
    };
  }

  /**
   * Clear all results and jobs
   */
  reset(): void {
    this.activeJobs.clear();
    this.mappingResults.clear();
    logger.info('Mapping engine reset');
  }
}