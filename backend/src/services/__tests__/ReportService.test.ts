import { ReportService, ReportData, ExportOptions } from '../ReportService';
import { MappingResult, ProcessingMetadata } from '../MappingEngine';
import { ISMControl, NISTControl } from '../../models/Control';

describe('ReportService', () => {
  let reportService: ReportService;
  let mockReportData: ReportData;

  beforeEach(() => {
    reportService = ReportService.getInstance();
    
    // Mock data for testing
    const mockISMControls: ISMControl[] = [
      {
        id: 'ISM-0001',
        title: 'Test ISM Control 1',
        description: 'Test description',
        implementationGuidance: 'Test guidance',
        controlFamily: 'Access Control',
        riskLevel: 'HIGH',
        source: 'ISM'
      },
      {
        id: 'ISM-0002',
        title: 'Test ISM Control 2',
        description: 'Test description 2',
        implementationGuidance: 'Test guidance 2',
        controlFamily: 'System Integrity',
        riskLevel: 'MEDIUM',
        source: 'ISM'
      }
    ];

    const mockNISTControls: NISTControl[] = [
      {
        id: 'AC-1',
        title: 'Access Control Policy and Procedures',
        description: 'NIST AC-1 description',
        family: 'Access Control',
        class: 'SP800-53',
        source: 'NIST-800-53'
      },
      {
        id: 'SI-1',
        title: 'System and Information Integrity Policy and Procedures',
        description: 'NIST SI-1 description',
        family: 'System and Information Integrity',
        class: 'SP800-53',
        source: 'NIST-800-53'
      }
    ];

    const mockMappings: MappingResult[] = [
      {
        ismControlId: 'ISM-0001',
        nistMappings: [
          {
            nistControlId: 'AC-1',
            confidence: 85,
            reasoning: 'Both controls focus on access control policies',
            isManualOverride: false
          }
        ],
        processingTimestamp: new Date('2024-01-01T10:00:00Z'),
        aiModel: 'gpt-4',
        processingTime: 1500
      },
      {
        ismControlId: 'ISM-0002',
        nistMappings: [
          {
            nistControlId: 'SI-1',
            confidence: 75,
            reasoning: 'Both controls address system integrity',
            isManualOverride: false
          },
          {
            nistControlId: 'AC-1',
            confidence: 60,
            reasoning: 'Secondary mapping with lower confidence',
            isManualOverride: true
          }
        ],
        processingTimestamp: new Date('2024-01-01T10:01:00Z'),
        aiModel: 'gpt-4',
        processingTime: 1800
      }
    ];

    const mockMetadata: ProcessingMetadata = {
      totalISMControls: 2,
      processedControls: 2,
      averageConfidence: 73.33,
      highConfidenceMappings: 2,
      unmappedControls: 0,
      processingStartTime: new Date('2024-01-01T10:00:00Z'),
      processingEndTime: new Date('2024-01-01T10:02:00Z'),
      totalProcessingTime: 3300
    };

    mockReportData = {
      mappings: mockMappings,
      metadata: mockMetadata,
      ismControls: mockISMControls,
      nistControls: mockNISTControls,
      generatedAt: new Date('2024-01-01T12:00:00Z')
    };
  });

  describe('generateReportData', () => {
    it('should generate report data with all required fields', () => {
      const result = reportService.generateReportData(
        mockReportData.mappings,
        mockReportData.metadata,
        mockReportData.ismControls,
        mockReportData.nistControls
      );

      expect(result).toHaveProperty('mappings');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('ismControls');
      expect(result).toHaveProperty('nistControls');
      expect(result).toHaveProperty('generatedAt');
      expect(result.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('exportAsJSON', () => {
    it('should export mappings as valid JSON', () => {
      const jsonString = reportService.exportAsJSON(mockReportData);
      const parsed = JSON.parse(jsonString);

      expect(parsed).toHaveProperty('metadata');
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('mappings');
      expect(parsed.mappings).toHaveLength(2);
      expect(parsed.metadata.title).toBe('ISM to NIST 800-53 Control Mappings');
    });

    it('should include reasoning by default', () => {
      const jsonString = reportService.exportAsJSON(mockReportData);
      const parsed = JSON.parse(jsonString);

      expect(parsed.mappings[0].nistMappings[0]).toHaveProperty('reasoning');
      expect(parsed.mappings[0].nistMappings[0].reasoning).toBe('Both controls focus on access control policies');
    });

    it('should exclude reasoning when option is false', () => {
      const options: ExportOptions = { format: 'json', includeReasoning: false };
      const jsonString = reportService.exportAsJSON(mockReportData, options);
      const parsed = JSON.parse(jsonString);

      expect(parsed.mappings[0].nistMappings[0].reasoning).toBeUndefined();
    });

    it('should filter by confidence threshold', () => {
      const options: ExportOptions = { format: 'json', confidenceThreshold: 80 };
      const jsonString = reportService.exportAsJSON(mockReportData, options);
      const parsed = JSON.parse(jsonString);

      // Should only include mappings with confidence >= 80
      expect(parsed.mappings).toHaveLength(1);
      expect(parsed.mappings[0].ismControl.id).toBe('ISM-0001');
    });

    it('should filter by control families', () => {
      const options: ExportOptions = { 
        format: 'json', 
        controlFamilies: ['Access Control'] 
      };
      const jsonString = reportService.exportAsJSON(mockReportData, options);
      const parsed = JSON.parse(jsonString);

      // Should only include ISM controls from Access Control family
      expect(parsed.mappings).toHaveLength(1);
      expect(parsed.mappings[0].ismControl.family).toBe('Access Control');
    });
  });

  describe('exportAsCSV', () => {
    it('should export mappings as valid CSV', () => {
      const csvString = reportService.exportAsCSV(mockReportData);
      const lines = csvString.split('\n');

      // Check header
      expect(lines[0]).toContain('ISM Control ID');
      expect(lines[0]).toContain('NIST Control ID');
      expect(lines[0]).toContain('Confidence Score');
      expect(lines[0]).toContain('Reasoning');

      // Check data rows (should have 3 mappings total)
      expect(lines.length).toBe(4); // Header + 3 data rows
      expect(lines[1]).toContain('ISM-0001');
      expect(lines[1]).toContain('AC-1');
      expect(lines[1]).toContain('85');
    });

    it('should exclude reasoning column when option is false', () => {
      const options: ExportOptions = { format: 'csv', includeReasoning: false };
      const csvString = reportService.exportAsCSV(mockReportData, options);
      const lines = csvString.split('\n');

      expect(lines[0]).not.toContain('Reasoning');
    });

    it('should handle CSV escaping for special characters', () => {
      // Create test data with special characters
      const testData = { ...mockReportData };
      testData.ismControls[0].title = 'Test "quoted" title, with comma';
      
      const csvString = reportService.exportAsCSV(testData);
      const lines = csvString.split('\n');

      expect(lines[1]).toContain('"Test ""quoted"" title, with comma"');
    });
  });

  describe('exportAsPDF', () => {
    it('should generate PDF buffer', async () => {
      const pdfBuffer = await reportService.exportAsPDF(mockReportData);
      
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      
      // Check PDF header
      const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should handle empty mappings gracefully', async () => {
      const emptyData = {
        ...mockReportData,
        mappings: []
      };

      await expect(reportService.exportAsPDF(emptyData)).resolves.toBeDefined();
    });
  });

  describe('generateSummaryStats', () => {
    it('should calculate correct summary statistics', () => {
      const stats = reportService.generateSummaryStats(mockReportData);

      expect(stats.totalISMControls).toBe(2);
      expect(stats.totalMappings).toBe(3);
      expect(stats.manualOverrides).toBe(1);
      expect(stats.averageProcessingTime).toBe(1650); // (1500 + 1800) / 2

      // Check confidence distribution
      expect(stats.confidenceDistribution['Very Good (85-94%)']).toBe(1); // AC-1 mapping
      expect(stats.confidenceDistribution['Good (75-84%)']).toBe(1); // SI-1 mapping
      expect(stats.confidenceDistribution['Poor (55-64%)']).toBe(1); // Second AC-1 mapping

      // Check family distribution
      expect(stats.familyDistribution['Access Control']).toBe(2);
      expect(stats.familyDistribution['System and Information Integrity']).toBe(1);
    });

    it('should handle empty data gracefully', () => {
      const emptyData = {
        ...mockReportData,
        mappings: []
      };

      const stats = reportService.generateSummaryStats(emptyData);

      expect(stats.totalISMControls).toBe(0);
      expect(stats.totalMappings).toBe(0);
      expect(stats.manualOverrides).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
    });
  });

  describe('generateBrandedReport', () => {
    it('should generate JSON report with correct filename', async () => {
      const options: ExportOptions = { format: 'json' };
      const report = await reportService.generateBrandedReport(mockReportData, options);

      expect(report.filename).toMatch(/^ism-nist-mappings_\d{4}-\d{2}-\d{2}\.json$/);
      expect(report.mimeType).toBe('application/json');
      expect(typeof report.content).toBe('string');
    });

    it('should generate CSV report with correct filename', async () => {
      const options: ExportOptions = { format: 'csv' };
      const report = await reportService.generateBrandedReport(mockReportData, options);

      expect(report.filename).toMatch(/^ism-nist-mappings_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(report.mimeType).toBe('text/csv');
      expect(typeof report.content).toBe('string');
    });

    it('should generate PDF report with correct filename', async () => {
      const options: ExportOptions = { format: 'pdf' };
      const report = await reportService.generateBrandedReport(mockReportData, options);

      expect(report.filename).toMatch(/^ism-nist-mappings_\d{4}-\d{2}-\d{2}\.pdf$/);
      expect(report.mimeType).toBe('application/pdf');
      expect(Buffer.isBuffer(report.content)).toBe(true);
    });

    it('should include confidence threshold in filename when specified', async () => {
      const options: ExportOptions = { format: 'json', confidenceThreshold: 80 };
      const report = await reportService.generateBrandedReport(mockReportData, options);

      expect(report.filename).toMatch(/^ism-nist-mappings_\d{4}-\d{2}-\d{2}_conf80\.json$/);
    });

    it('should throw error for unsupported format', async () => {
      const options = { format: 'xml' as any };
      
      await expect(reportService.generateBrandedReport(mockReportData, options))
        .rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('error handling', () => {
    it('should handle CSV export errors gracefully', () => {
      // Mock data with undefined values that could cause issues
      const badData = {
        ...mockReportData,
        ismControls: [null as any]
      };

      expect(() => {
        reportService.exportAsCSV(badData);
      }).toThrow('Failed to generate CSV export');
    });
  });
});