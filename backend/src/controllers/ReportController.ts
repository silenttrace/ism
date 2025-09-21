import { Request, Response } from 'express';
import { ReportService, ExportOptions } from '../services/ReportService';
import { MappingEngine } from '../services/MappingEngine';
import { ControlService } from '../services/ControlService';
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'info',
  format: require('winston').format.json(),
  transports: [
    new (require('winston').transports.Console)()
  ]
});

export class ReportController {
  private reportService: ReportService;
  private mappingEngine: MappingEngine;
  private controlService: ControlService;

  constructor() {
    this.reportService = ReportService.getInstance();
    this.mappingEngine = MappingEngine.getInstance();
    this.controlService = ControlService.getInstance();
  }

  /**
   * Generate and download report in specified format
   */
  async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const { format = 'json' } = req.params;
      const {
        includeReasoning = true,
        confidenceThreshold,
        controlFamilies
      } = req.query;

      // Validate format
      if (!['json', 'csv', 'pdf'].includes(format)) {
        res.status(400).json({
          success: false,
          error: 'Invalid format. Supported formats: json, csv, pdf'
        });
        return;
      }

      // Validate confidence threshold
      if (confidenceThreshold && (isNaN(Number(confidenceThreshold)) || Number(confidenceThreshold) < 0 || Number(confidenceThreshold) > 100)) {
        res.status(400).json({
          success: false,
          error: 'Confidence threshold must be a number between 0 and 100'
        });
        return;
      }

      // Get data
      const mappings = this.mappingEngine.getAllMappingResults();
      const metadata = this.mappingEngine.calculateProcessingMetadata();
      const ismControls = this.controlService.getISMControls();
      const nistControls = this.controlService.getNISTControls();

      if (mappings.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No mapping results found. Please run the mapping process first.'
        });
        return;
      }

      // Generate report data
      const reportData = this.reportService.generateReportData(
        mappings,
        metadata,
        ismControls,
        nistControls
      );

      // Prepare export options
      const exportOptions: ExportOptions = {
        format: format as 'json' | 'csv' | 'pdf',
        includeReasoning: includeReasoning === 'true',
        confidenceThreshold: confidenceThreshold ? Number(confidenceThreshold) : undefined,
        controlFamilies: controlFamilies ? String(controlFamilies).split(',') : undefined
      };

      // Generate branded report
      const report = await this.reportService.generateBrandedReport(reportData, exportOptions);

      // Set response headers
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      res.setHeader('Content-Type', report.mimeType);

      // Send the report
      if (Buffer.isBuffer(report.content)) {
        res.send(report.content);
      } else {
        res.send(report.content);
      }

      logger.info(`Generated ${format} report: ${report.filename}`);
    } catch (error) {
      logger.error('Failed to export report:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report'
      });
    }
  }

  /**
   * Get summary statistics for the dashboard
   */
  async getSummaryStats(req: Request, res: Response): Promise<void> {
    try {
      const mappings = this.mappingEngine.getAllMappingResults();
      const metadata = this.mappingEngine.calculateProcessingMetadata();
      const ismControls = this.controlService.getISMControls();
      const nistControls = this.controlService.getNISTControls();

      if (mappings.length === 0) {
        res.json({
          success: true,
          data: {
            totalISMControls: 0,
            totalMappings: 0,
            confidenceDistribution: {},
            familyDistribution: {},
            manualOverrides: 0,
            averageProcessingTime: 0,
            metadata
          }
        });
        return;
      }

      const reportData = this.reportService.generateReportData(
        mappings,
        metadata,
        ismControls,
        nistControls
      );

      const summaryStats = this.reportService.generateSummaryStats(reportData);

      res.json({
        success: true,
        data: {
          ...summaryStats,
          metadata
        }
      });
    } catch (error) {
      logger.error('Failed to get summary stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve summary statistics'
      });
    }
  }

  /**
   * Preview report data without generating full export
   */
  async previewReport(req: Request, res: Response): Promise<void> {
    try {
      const {
        confidenceThreshold,
        controlFamilies,
        limit = 10
      } = req.query;

      // Validate limit
      const limitNum = Number(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          success: false,
          error: 'Limit must be a number between 1 and 100'
        });
        return;
      }

      // Get data
      const mappings = this.mappingEngine.getAllMappingResults();
      const metadata = this.mappingEngine.calculateProcessingMetadata();
      const ismControls = this.controlService.getISMControls();
      const nistControls = this.controlService.getNISTControls();

      if (mappings.length === 0) {
        res.json({
          success: true,
          data: {
            preview: [],
            totalMappings: 0,
            filteredMappings: 0,
            metadata
          }
        });
        return;
      }

      const reportData = this.reportService.generateReportData(
        mappings,
        metadata,
        ismControls,
        nistControls
      );

      // Apply filters for preview
      const exportOptions: ExportOptions = {
        format: 'json',
        confidenceThreshold: confidenceThreshold ? Number(confidenceThreshold) : undefined,
        controlFamilies: controlFamilies ? String(controlFamilies).split(',') : undefined
      };

      // Get filtered data
      const filteredData = (this.reportService as any).applyFilters(reportData, exportOptions);
      
      // Create preview with limited results
      const preview = filteredData.mappings.slice(0, limitNum).map((mapping: any) => {
        const ismControl = filteredData.ismControls.find((c: any) => c.id === mapping.ismControlId);
        return {
          ismControl: {
            id: mapping.ismControlId,
            title: ismControl?.title || 'Unknown',
            family: ismControl?.controlFamily || 'Unknown'
          },
          nistMappings: mapping.nistMappings.map((nm: any) => {
            const nistControl = filteredData.nistControls.find((c: any) => c.id === nm.nistControlId);
            return {
              nistControlId: nm.nistControlId,
              nistTitle: nistControl?.title || 'Unknown',
              confidence: nm.confidence,
              isManualOverride: nm.isManualOverride
            };
          }),
          processingTime: mapping.processingTime
        };
      });

      res.json({
        success: true,
        data: {
          preview,
          totalMappings: reportData.mappings.length,
          filteredMappings: filteredData.mappings.length,
          showingFirst: Math.min(limitNum, filteredData.mappings.length),
          metadata: filteredData.metadata
        }
      });
    } catch (error) {
      logger.error('Failed to preview report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report preview'
      });
    }
  }

  /**
   * Get available export formats and their descriptions
   */
  async getExportFormats(req: Request, res: Response): Promise<void> {
    try {
      const formats = [
        {
          format: 'json',
          description: 'Structured JSON format with complete mapping data',
          mimeType: 'application/json',
          extension: '.json',
          features: ['Complete data structure', 'Machine readable', 'Includes metadata']
        },
        {
          format: 'csv',
          description: 'Comma-separated values for spreadsheet applications',
          mimeType: 'text/csv',
          extension: '.csv',
          features: ['Spreadsheet compatible', 'Flat data structure', 'Easy to analyze']
        },
        {
          format: 'pdf',
          description: 'Professional report with charts and formatting',
          mimeType: 'application/pdf',
          extension: '.pdf',
          features: ['Professional formatting', 'Executive summary', 'Charts and statistics', 'Print ready']
        }
      ];

      res.json({
        success: true,
        data: {
          formats,
          supportedOptions: {
            includeReasoning: 'Include detailed reasoning for each mapping (boolean)',
            confidenceThreshold: 'Filter mappings by minimum confidence score (0-100)',
            controlFamilies: 'Filter by specific control families (comma-separated)'
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get export formats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve export formats'
      });
    }
  }
}