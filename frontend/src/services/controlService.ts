import axios from 'axios';

const API_BASE_URL = '/api';

export interface ISMControl {
  id: string;
  title: string;
  description: string;
  implementationGuidance: string;
  controlFamily: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  source: 'ISM';
}

export interface NISTControl {
  id: string;
  title: string;
  description: string;
  family: string;
  class: string;
  source: 'NIST-800-53';
}

export interface ControlLoadingStatus {
  isLoading: boolean;
  ismControlsLoaded: boolean;
  nistControlsLoaded: boolean;
  ismControlCount: number;
  nistControlCount: number;
  lastLoadTime?: string;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

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
  processingTimestamp: string;
  aiModel: string;
  processingTime: number;
}

export interface ProcessingJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalControls: number;
  processedControls: number;
  startTime: string;
  endTime?: string;
  error?: string;
}

export interface ProcessingMetadata {
  totalISMControls: number;
  processedControls: number;
  averageConfidence: number;
  highConfidenceMappings: number;
  unmappedControls: number;
  processingStartTime: string;
  processingEndTime?: string;
  totalProcessingTime: number;
}

export interface SummaryStats {
  totalISMControls: number;
  totalMappings: number;
  confidenceDistribution: { [key: string]: number };
  familyDistribution: { [key: string]: number };
  manualOverrides: number;
  averageProcessingTime: number;
  metadata: ProcessingMetadata;
}

export interface ReportPreviewOptions {
  confidenceThreshold?: number;
  controlFamilies?: string[];
  limit?: number;
}

export interface ReportPreview {
  preview: Array<{
    ismControl: {
      id: string;
      title: string;
      family: string;
    };
    nistMappings: Array<{
      nistControlId: string;
      nistTitle: string;
      confidence: number;
      isManualOverride: boolean;
    }>;
    processingTime: number;
  }>;
  totalMappings: number;
  filteredMappings: number;
  showingFirst: number;
  metadata: ProcessingMetadata;
}

export interface ExportOptions {
  includeReasoning?: boolean;
  confidenceThreshold?: number;
  controlFamilies?: string[];
}

export interface ExportFormat {
  format: string;
  description: string;
  mimeType: string;
  extension: string;
  features: string[];
}

export interface ExportFormatsResponse {
  formats: ExportFormat[];
  supportedOptions: {
    includeReasoning: string;
    confidenceThreshold: string;
    controlFamilies: string;
  };
}

export class ControlService {
  private static instance: ControlService;

  private constructor() {}

  public static getInstance(): ControlService {
    if (!ControlService.instance) {
      ControlService.instance = new ControlService();
    }
    return ControlService.instance;
  }

  /**
   * Load all controls from the backend
   */
  async loadControls(): Promise<{ ismControlCount: number; nistControlCount: number; loadTime?: string }> {
    try {
      const response = await axios.post<ApiResponse<{
        ismControlCount: number;
        nistControlCount: number;
        loadTime?: string;
      }>>(`${API_BASE_URL}/controls/load`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to load controls');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get loading status
   */
  async getLoadingStatus(): Promise<ControlLoadingStatus> {
    try {
      const response = await axios.get<ApiResponse<ControlLoadingStatus>>(`${API_BASE_URL}/controls/status`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get loading status');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get all ISM controls
   */
  async getISMControls(): Promise<{ controls: ISMControl[]; count: number }> {
    try {
      const response = await axios.get<ApiResponse<{ controls: ISMControl[]; count: number }>>(
        `${API_BASE_URL}/controls/ism`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get ISM controls');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get all NIST controls
   */
  async getNISTControls(): Promise<{ controls: NISTControl[]; count: number }> {
    try {
      const response = await axios.get<ApiResponse<{ controls: NISTControl[]; count: number }>>(
        `${API_BASE_URL}/controls/nist`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get NIST controls');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get ISM control by ID
   */
  async getISMControlById(id: string): Promise<ISMControl> {
    try {
      const response = await axios.get<ApiResponse<ISMControl>>(`${API_BASE_URL}/controls/ism/${id}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get ISM control');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Search ISM controls
   */
  async searchISMControls(query: string): Promise<{ controls: ISMControl[]; count: number; query: string }> {
    try {
      const response = await axios.get<ApiResponse<{ controls: ISMControl[]; count: number; query: string }>>(
        `${API_BASE_URL}/controls/ism/search`,
        { params: { q: query } }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to search ISM controls');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get control families
   */
  async getControlFamilies(): Promise<{ ism: string[]; nist: string[] }> {
    try {
      const response = await axios.get<ApiResponse<{ ism: string[]; nist: string[] }>>(
        `${API_BASE_URL}/controls/families`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get control families');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Start processing ISM controls for mapping
   */
  async startProcessing(controlIds?: string[]): Promise<{ jobId: string; status: string; message: string }> {
    try {
      const response = await axios.post<ApiResponse<{
        jobId: string;
        status: string;
        message: string;
      }>>(`${API_BASE_URL}/mappings/process`, { controlIds });

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to start processing');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get processing job status
   */
  async getJobStatus(jobId: string): Promise<ProcessingJob> {
    try {
      const response = await axios.get<ApiResponse<ProcessingJob>>(`${API_BASE_URL}/mappings/status/${jobId}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get job status');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get new results from queue
   */
  async getNewResults(jobId: string): Promise<{ hasNewResults: boolean; results: any[]; count: number }> {
    try {
      const response = await axios.get<ApiResponse<{ hasNewResults: boolean; results: any[]; count: number }>>(`${API_BASE_URL}/mappings/results/${jobId}`);
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get new results');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get all mapping results
   */
  async getAllMappings(): Promise<{ mappings: MappingResult[]; metadata: ProcessingMetadata }> {
    try {
      const response = await axios.get<ApiResponse<{
        mappings: MappingResult[];
        metadata: ProcessingMetadata;
      }>>(`${API_BASE_URL}/mappings`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get mappings');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get mapping for specific ISM control
   */
  async getMappingByControlId(controlId: string): Promise<MappingResult> {
    try {
      const response = await axios.get<ApiResponse<MappingResult>>(`${API_BASE_URL}/mappings/${controlId}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get mapping');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Apply manual override to a mapping
   */
  async applyManualOverride(
    controlId: string,
    nistControlId: string,
    confidence: number,
    reasoning: string
  ): Promise<void> {
    try {
      const response = await axios.put<ApiResponse<void>>(
        `${API_BASE_URL}/mappings/${controlId}/override`,
        { nistControlId, confidence, reasoning }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to apply manual override');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Test AI service connection (OpenAI or Ollama)
   */
  async testAI(): Promise<{ connected: boolean; stats: { requestCount: number; model: string } }> {
    try {
      const response = await axios.get<ApiResponse<{
        connected: boolean;
        stats: { requestCount: number; model: string };
      }>>(`${API_BASE_URL}/mappings/test/ai`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to test AI service connection');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get summary statistics for reports
   */
  async getSummaryStats(): Promise<SummaryStats> {
    try {
      const response = await axios.get<ApiResponse<SummaryStats>>(`${API_BASE_URL}/reports/summary`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get summary statistics');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Preview report data
   */
  async previewReport(options: ReportPreviewOptions = {}): Promise<ReportPreview> {
    try {
      const params = new URLSearchParams();
      if (options.confidenceThreshold !== undefined) {
        params.append('confidenceThreshold', options.confidenceThreshold.toString());
      }
      if (options.controlFamilies && options.controlFamilies.length > 0) {
        params.append('controlFamilies', options.controlFamilies.join(','));
      }
      if (options.limit !== undefined) {
        params.append('limit', options.limit.toString());
      }

      const response = await axios.get<ApiResponse<ReportPreview>>(
        `${API_BASE_URL}/reports/preview?${params.toString()}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to preview report');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get available export formats
   */
  async getExportFormats(): Promise<ExportFormatsResponse> {
    try {
      const response = await axios.get<ApiResponse<ExportFormatsResponse>>(`${API_BASE_URL}/reports/formats`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get export formats');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Download report in specified format
   */
  async downloadReport(format: 'json' | 'csv' | 'pdf', options: ExportOptions = {}): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (options.includeReasoning !== undefined) {
        params.append('includeReasoning', options.includeReasoning.toString());
      }
      if (options.confidenceThreshold !== undefined) {
        params.append('confidenceThreshold', options.confidenceThreshold.toString());
      }
      if (options.controlFamilies && options.controlFamilies.length > 0) {
        params.append('controlFamilies', options.controlFamilies.join(','));
      }

      const response = await axios.get(
        `${API_BASE_URL}/reports/export/${format}?${params.toString()}`,
        { responseType: 'blob' }
      );

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `ism-nist-mappings.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Reset all mappings and processing jobs
   */
  async resetMappings(): Promise<void> {
    try {
      const response = await axios.post<ApiResponse<void>>(`${API_BASE_URL}/mappings/reset`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to reset mappings');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }
}