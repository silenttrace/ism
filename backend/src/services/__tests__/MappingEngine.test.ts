import { MappingEngine } from '../MappingEngine';
import { OllamaService } from '../OllamaService';
import { ControlService } from '../ControlService';
import { ISMControl, NISTControl } from '../../models/Control';

// Mock dependencies
jest.mock('../OllamaService');
jest.mock('../ControlService');

const MockedOllamaService = jest.mocked(OllamaService);
const MockedControlService = jest.mocked(ControlService);

describe('MappingEngine', () => {
  let mappingEngine: MappingEngine;
  let mockOllamaService: jest.Mocked<OllamaService>;
  let mockControlService: jest.Mocked<ControlService>;

  const mockISMControls: ISMControl[] = [
    {
      id: 'ism-001',
      title: 'Test ISM Control 1',
      description: 'Test description 1',
      implementationGuidance: 'Test guidance 1',
      controlFamily: 'Security',
      riskLevel: 'HIGH',
      source: 'ISM'
    },
    {
      id: 'ism-002',
      title: 'Test ISM Control 2',
      description: 'Test description 2',
      implementationGuidance: 'Test guidance 2',
      controlFamily: 'Privacy',
      riskLevel: 'MEDIUM',
      source: 'ISM'
    }
  ];

  const mockNISTControls: NISTControl[] = [
    {
      id: 'ac-1',
      title: 'Access Control Policy',
      description: 'Access control policy description',
      family: 'Access Control',
      class: 'operational',
      source: 'NIST-800-53'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton
    (MappingEngine as any).instance = undefined;
    mappingEngine = MappingEngine.getInstance();

    // Mock Ollama service
    mockOllamaService = {
      batchAnalyzeControls: jest.fn(),
      analyzeControlMapping: jest.fn(),
      testConnection: jest.fn(),
      getStats: jest.fn()
    } as any;

    // Mock Control service
    mockControlService = {
      isReady: jest.fn(),
      getISMControls: jest.fn(),
      getNISTControls: jest.fn(),
      getISMControlById: jest.fn()
    } as any;

    MockedControlService.getInstance.mockReturnValue(mockControlService);
  });

  afterEach(() => {
    mappingEngine.reset();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MappingEngine.getInstance();
      const instance2 = MappingEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize with Ollama service', () => {
      expect(() => mappingEngine.initialize(mockOllamaService)).not.toThrow();
    });
  });

  describe('startProcessing', () => {
    beforeEach(() => {
      mappingEngine.initialize(mockOllamaService);
      mockControlService.isReady.mockReturnValue(true);
      mockControlService.getISMControls.mockReturnValue(mockISMControls);
      mockControlService.getNISTControls.mockReturnValue(mockNISTControls);
    });

    it('should start processing successfully', async () => {
      const mockResults = new Map([
        ['ism-001', {
          mappings: [
            {
              nistControlId: 'ac-1',
              confidence: 85,
              reasoning: 'Test reasoning'
            }
          ],
          processingTime: 1000,
          model: 'llama3.1',
          timestamp: new Date()
        }]
      ]);

      mockOllamaService.batchAnalyzeControls.mockResolvedValueOnce(mockResults);

      const jobId = await mappingEngine.startProcessing();

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(jobId.startsWith('job_')).toBe(true);
    });

    it('should throw error if Ollama service not initialized', async () => {
      const uninitializedEngine = MappingEngine.getInstance();
      uninitializedEngine.reset();

      await expect(uninitializedEngine.startProcessing()).rejects.toThrow('Ollama service not initialized');
    });

    it('should throw error if control service not ready', async () => {
      mockControlService.isReady.mockReturnValue(false);

      await expect(mappingEngine.startProcessing()).rejects.toThrow('Control service not ready');
    });
  });

  describe('manual overrides', () => {
    it('should apply manual override successfully', () => {
      expect(() => {
        mappingEngine.applyManualOverride('ism-001', 'ac-1', 95, 'Manual review confirms mapping');
      }).not.toThrow();

      const result = mappingEngine.getMappingResult('ism-001');
      expect(result).toBeDefined();
      expect(result?.nistMappings[0]).toMatchObject({
        nistControlId: 'ac-1',
        confidence: 95,
        reasoning: 'Manual review confirms mapping',
        isManualOverride: true
      });
    });
  });

  describe('reset', () => {
    it('should clear all data', () => {
      mappingEngine.applyManualOverride('ism-001', 'ac-1', 85, 'Test');
      
      expect(mappingEngine.getMappingResult('ism-001')).toBeDefined();
      
      mappingEngine.reset();
      
      expect(mappingEngine.getMappingResult('ism-001')).toBeNull();
      expect(mappingEngine.getProcessingStats().totalMappings).toBe(0);
    });
  });
});