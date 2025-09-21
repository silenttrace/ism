import { createLogger } from 'winston';
import { MappingResult, ProcessingMetadata } from './MappingEngine';
import { ISMControl, NISTControl } from '../models/Control';
import PDFDocument from 'pdfkit';

const logger = createLogger({
  level: 'info',
  format: require('winston').format.json(),
  transports: [
    new (require('winston').transports.Console)()
  ]
});

export interface ReportData {
  mappings: MappingResult[];
  metadata: ProcessingMetadata;
  ismControls: ISMControl[];
  nistControls: NISTControl[];
  generatedAt: Date;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeReasoning?: boolean;
  confidenceThreshold?: number;
  controlFamilies?: string[];
}

export class ReportService {
  private static instance: ReportService;

  private constructor() {}

  public static getInstance(): ReportService {
    if (!ReportService.instance) {
      ReportService.instance = new ReportService();
    }
    return ReportService.instance;
  }

  /**
   * Generate comprehensive report data
   */
  generateReportData(
    mappings: MappingResult[],
    metadata: ProcessingMetadata,
    ismControls: ISMControl[],
    nistControls: NISTControl[]
  ): ReportData {
    return {
      mappings,
      metadata,
      ismControls,
      nistControls,
      generatedAt: new Date()
    };
  }

  /**
   * Export mappings as JSON
   */
  exportAsJSON(reportData: ReportData, options: ExportOptions = { format: 'json' }): string {
    try {
      const filteredData = this.applyFilters(reportData, options);
      
      const exportData = {
        metadata: {
          title: 'ISM to NIST 800-53 Control Mappings',
          generatedAt: filteredData.generatedAt.toISOString(),
          totalMappings: filteredData.mappings.length,
          averageConfidence: filteredData.metadata.averageConfidence,
          filters: {
            confidenceThreshold: options.confidenceThreshold,
            controlFamilies: options.controlFamilies
          }
        },
        summary: filteredData.metadata,
        mappings: filteredData.mappings.map(mapping => ({
          ismControl: {
            id: mapping.ismControlId,
            title: filteredData.ismControls.find(c => c.id === mapping.ismControlId)?.title || 'Unknown',
            family: filteredData.ismControls.find(c => c.id === mapping.ismControlId)?.controlFamily || 'Unknown'
          },
          nistMappings: mapping.nistMappings.map(nm => ({
            nistControlId: nm.nistControlId,
            nistTitle: filteredData.nistControls.find(c => c.id === nm.nistControlId)?.title || 'Unknown',
            confidence: nm.confidence,
            reasoning: options.includeReasoning !== false ? nm.reasoning : undefined,
            isManualOverride: nm.isManualOverride
          })),
          processingInfo: {
            timestamp: mapping.processingTimestamp,
            aiModel: mapping.aiModel,
            processingTime: mapping.processingTime
          }
        }))
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      logger.error('Failed to export as JSON:', error);
      throw new Error('Failed to generate JSON export');
    }
  }

  /**
   * Export mappings as CSV
   */
  exportAsCSV(reportData: ReportData, options: ExportOptions = { format: 'csv' }): string {
    try {
      const filteredData = this.applyFilters(reportData, options);
      
      const headers = [
        'ISM Control ID',
        'ISM Control Title',
        'ISM Control Family',
        'NIST Control ID',
        'NIST Control Title',
        'NIST Control Family',
        'Confidence Score',
        'Manual Override',
        'Processing Time',
        'AI Model'
      ];

      if (options.includeReasoning !== false) {
        headers.push('Reasoning');
      }

      const rows = [headers.join(',')];

      for (const mapping of filteredData.mappings) {
        const ismControl = filteredData.ismControls.find(c => c.id === mapping.ismControlId);
        
        for (const nistMapping of mapping.nistMappings) {
          const nistControl = filteredData.nistControls.find(c => c.id === nistMapping.nistControlId);
          
          const row = [
            this.escapeCsvValue(mapping.ismControlId),
            this.escapeCsvValue(ismControl?.title || 'Unknown'),
            this.escapeCsvValue(ismControl?.controlFamily || 'Unknown'),
            this.escapeCsvValue(nistMapping.nistControlId),
            this.escapeCsvValue(nistControl?.title || 'Unknown'),
            this.escapeCsvValue(nistControl?.family || 'Unknown'),
            nistMapping.confidence.toString(),
            nistMapping.isManualOverride ? 'Yes' : 'No',
            this.formatProcessingTime(mapping.processingTime),
            this.escapeCsvValue(mapping.aiModel)
          ];

          if (options.includeReasoning !== false) {
            row.push(this.escapeCsvValue(nistMapping.reasoning));
          }

          rows.push(row.join(','));
        }
      }

      return rows.join('\n');
    } catch (error) {
      logger.error('Failed to export as CSV:', error);
      throw new Error('Failed to generate CSV export');
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummaryStats(reportData: ReportData): {
    totalISMControls: number;
    totalMappings: number;
    confidenceDistribution: { [key: string]: number };
    familyDistribution: { [key: string]: number };
    manualOverrides: number;
    averageProcessingTime: number;
  } {
    const stats = {
      totalISMControls: reportData.mappings.length,
      totalMappings: 0,
      confidenceDistribution: {
        'Excellent (95-100%)': 0,
        'Very Good (85-94%)': 0,
        'Good (75-84%)': 0,
        'Fair (65-74%)': 0,
        'Poor (55-64%)': 0,
        'Very Poor (<55%)': 0
      },
      familyDistribution: {} as { [key: string]: number },
      manualOverrides: 0,
      averageProcessingTime: 0
    };

    let totalProcessingTime = 0;

    for (const mapping of reportData.mappings) {
      totalProcessingTime += mapping.processingTime;
      
      for (const nistMapping of mapping.nistMappings) {
        stats.totalMappings++;
        
        // Confidence distribution
        if (nistMapping.confidence >= 95) stats.confidenceDistribution['Excellent (95-100%)']++;
        else if (nistMapping.confidence >= 85) stats.confidenceDistribution['Very Good (85-94%)']++;
        else if (nistMapping.confidence >= 75) stats.confidenceDistribution['Good (75-84%)']++;
        else if (nistMapping.confidence >= 65) stats.confidenceDistribution['Fair (65-74%)']++;
        else if (nistMapping.confidence >= 55) stats.confidenceDistribution['Poor (55-64%)']++;
        else stats.confidenceDistribution['Very Poor (<55%)']++;

        // Manual overrides
        if (nistMapping.isManualOverride) {
          stats.manualOverrides++;
        }

        // Family distribution
        const nistControl = reportData.nistControls.find(c => c.id === nistMapping.nistControlId);
        if (nistControl) {
          const family = nistControl.family;
          stats.familyDistribution[family] = (stats.familyDistribution[family] || 0) + 1;
        }
      }
    }

    stats.averageProcessingTime = stats.totalMappings > 0 ? totalProcessingTime / reportData.mappings.length : 0;

    return stats;
  }

  /**
   * Apply filters to report data
   */
  private applyFilters(reportData: ReportData, options: ExportOptions): ReportData {
    let filteredMappings = [...reportData.mappings];

    // Apply confidence threshold filter
    if (options.confidenceThreshold !== undefined) {
      filteredMappings = filteredMappings.filter(mapping =>
        mapping.nistMappings.some(nm => nm.confidence >= options.confidenceThreshold!)
      );
    }

    // Apply control family filter
    if (options.controlFamilies && options.controlFamilies.length > 0) {
      filteredMappings = filteredMappings.filter(mapping => {
        const ismControl = reportData.ismControls.find(c => c.id === mapping.ismControlId);
        return ismControl && options.controlFamilies!.includes(ismControl.controlFamily);
      });
    }

    return {
      ...reportData,
      mappings: filteredMappings
    };
  }

  /**
   * Export mappings as PDF
   */
  exportAsPDF(reportData: ReportData, options: ExportOptions = { format: 'pdf' }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const filteredData = this.applyFilters(reportData, options);
        const summaryStats = this.generateSummaryStats(filteredData);
        
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (error) => reject(error));
        
        // Title page
        doc.fontSize(24).text('ISM to NIST 800-53 Control Mappings Report', { align: 'center' });
        doc.moveDown(2);
        
        // Report metadata
        doc.fontSize(12);
        doc.text(`Generated: ${filteredData.generatedAt.toLocaleString()}`, { align: 'right' });
        doc.text(`Total Mappings: ${summaryStats.totalMappings}`, { align: 'right' });
        doc.text(`Average Confidence: ${summaryStats.averageProcessingTime.toFixed(1)}%`, { align: 'right' });
        doc.moveDown(2);
        
        // Executive Summary
        doc.fontSize(16).text('Executive Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`This report contains ${summaryStats.totalISMControls} ISM controls mapped to NIST 800-53 controls with a total of ${summaryStats.totalMappings} mappings identified.`);
        doc.text(`${summaryStats.manualOverrides} mappings have been manually reviewed and adjusted.`);
        doc.text(`Average processing time per control: ${this.formatProcessingTime(summaryStats.averageProcessingTime)}`);
        doc.moveDown(1);
        
        // Confidence Distribution
        doc.fontSize(14).text('Confidence Distribution', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        Object.entries(summaryStats.confidenceDistribution).forEach(([range, count]) => {
          const percentage = summaryStats.totalMappings > 0 ? ((count / summaryStats.totalMappings) * 100).toFixed(1) : '0.0';
          doc.text(`${range}: ${count} mappings (${percentage}%)`);
        });
        doc.moveDown(1);
        
        // Control Family Distribution
        doc.fontSize(14).text('NIST Control Family Distribution', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        const sortedFamilies = Object.entries(summaryStats.familyDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10); // Top 10 families
        
        sortedFamilies.forEach(([family, count]) => {
          const percentage = summaryStats.totalMappings > 0 ? ((count / summaryStats.totalMappings) * 100).toFixed(1) : '0.0';
          doc.text(`${family}: ${count} mappings (${percentage}%)`);
        });
        
        if (Object.keys(summaryStats.familyDistribution).length > 10) {
          doc.text(`... and ${Object.keys(summaryStats.familyDistribution).length - 10} more families`);
        }
        doc.moveDown(2);
        
        // Detailed Mappings
        if (filteredData.mappings.length > 0) {
          doc.addPage();
          doc.fontSize(16).text('Detailed Mappings', { underline: true });
          doc.moveDown(1);
          
          filteredData.mappings.forEach((mapping, index) => {
            const ismControl = filteredData.ismControls.find(c => c.id === mapping.ismControlId);
            
            // Check if we need a new page
            if (doc.y > 700) {
              doc.addPage();
            }
            
            doc.fontSize(12).fillColor('black').text(`${index + 1}. ISM Control: ${mapping.ismControlId}`, { continued: false });
            if (ismControl) {
              doc.fontSize(10).fillColor('gray').text(`Title: ${ismControl.title}`);
              doc.text(`Family: ${ismControl.controlFamily}`);
            }
            doc.moveDown(0.5);
            
            mapping.nistMappings.forEach((nistMapping, nIndex) => {
              const nistControl = filteredData.nistControls.find(c => c.id === nistMapping.nistControlId);
              
              doc.fontSize(11).fillColor('black').text(`   ${String.fromCharCode(97 + nIndex)}. NIST ${nistMapping.nistControlId} (${nistMapping.confidence}% confidence)`);
              
              if (nistControl) {
                doc.fontSize(9).fillColor('gray').text(`      ${nistControl.title}`);
              }
              
              if (nistMapping.isManualOverride) {
                doc.fillColor('blue').text('      [Manual Override]');
              }
              
              if (options.includeReasoning !== false && nistMapping.reasoning) {
                // Check if we need a new page for the reasoning text
                if (doc.y > 650) {
                  doc.addPage();
                }
                doc.fontSize(9).fillColor('black').text(`      Reasoning: ${nistMapping.reasoning}`, {
                  width: doc.page.width - 100,
                  align: 'left'
                });
              }
              doc.moveDown(0.3);
            });
            
            doc.moveDown(0.5);
          });
        }
        
        // Add footer
        doc.fontSize(8).fillColor('gray');
        doc.text('ISM-NIST Mapping Report', 50, doc.page.height - 50, { align: 'center' });
        
        doc.end();
        
      } catch (error) {
        logger.error('Failed to export as PDF:', error);
        reject(new Error('Failed to generate PDF export'));
      }
    });
  }

  /**
   * Generate downloadable report with branding
   */
  async generateBrandedReport(reportData: ReportData, options: ExportOptions): Promise<{
    filename: string;
    content: string | Buffer;
    mimeType: string;
  }> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filterSuffix = options.confidenceThreshold ? `_conf${options.confidenceThreshold}` : '';
    
    switch (options.format) {
      case 'json':
        return {
          filename: `ism-nist-mappings_${timestamp}${filterSuffix}.json`,
          content: this.exportAsJSON(reportData, options),
          mimeType: 'application/json'
        };
      
      case 'csv':
        return {
          filename: `ism-nist-mappings_${timestamp}${filterSuffix}.csv`,
          content: this.exportAsCSV(reportData, options),
          mimeType: 'text/csv'
        };
      
      case 'pdf':
        const pdfContent = await this.exportAsPDF(reportData, options);
        return {
          filename: `ism-nist-mappings_${timestamp}${filterSuffix}.pdf`,
          content: pdfContent,
          mimeType: 'application/pdf'
        };
      
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Format processing time in a human-readable format
   */
  private formatProcessingTime(timeMs: number): string {
    if (timeMs < 1000) {
      return `${timeMs.toFixed(0)}ms`;
    } else if (timeMs < 60000) {
      return `${(timeMs / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(timeMs / 60000);
      const seconds = Math.floor((timeMs % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Escape CSV values
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}