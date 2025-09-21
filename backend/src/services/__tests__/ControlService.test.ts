import { ControlService } from '../ControlService';
import { OSCALParser } from '../OSCALParser';
import { ISMControl, NISTControl } from '../../models/Control';

// Mock the OSCALParser
jest.mock('../OSCALParser');
const MockedOSCALParser = jest.mocked(OSCALParser);

describe('ControlService', () => {
  let controlService: ControlService;
  let mockOSCALParser: jest.Mocked<OSCALParser>;

  beforeEach(() => {
    // Reset the singleton instance
    (ControlService as any).instance = undefined;
    controlService = ControlService.getInstance();
    
    // Get the mocked parser instance
    mockOSCALParser = MockedOSCALParser.mock.instances[0] as jest.Mocked<OSCALParser>;
  });

  afterEach(() => {
    controlService.reset();
    jest.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ControlService.getInstance();
      const instance2 = ControlService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadAllControls', () => {
    it('should load both ISM and NIST controls successfully', async () => {
      const mockISMControls: ISMControl[] = [
        {
          id: 'ism-001',
          title: 'Test ISM Control',
          description: 'Test description',
          implementationGuidance: 'Test guidance',
          controlFamily: 'Test Family',
          riskLevel: 'MEDIUM',
          source: 'ISM'
        }
      ];

      const mockNISTControls: NISTControl[] = [
        {
          id: 'ac-1',
          title: 'Access Control Policy',
          description: 'Test NIST description',
          family: 'Access Control',
          class: 'operational',
          source: 'NIST-800-53'
        }
      ];

      mockOSCALParser.loadISMControls.mockResolvedValueOnce(mockISMControls);
      mockOSCALParser.loadNISTControls.mockResolvedValueOnce(mockNISTControls);

      await controlService.loadAllControls();

      const status = controlService.getLoadingStatus();
      expect(status.ismControlsLoaded).toBe(true);
      expect(status.nistControlsLoaded).toBe(true);
      expect(status.ismControlCount).toBe(1);
      expect(status.nistControlCount).toBe(1);
      expect(status.isLoading).toBe(false);
    });

    it('should handle loading errors gracefully', async () => {
      mockOSCALParser.loadISMControls.mockRejectedValueOnce(new Error('Load failed'));

      await expect(controlService.loadAllControls()).rejects.toThrow('Load failed');

      const status = controlService.getLoadingStatus();
      expect(status.isLoading).toBe(false);
      expect(status.error).toBe('Load failed');
    });

    it('should prevent concurrent loading', async () => {
      mockOSCALParser.loadISMControls.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const promise1 = controlService.loadAllControls();
      const promise2 = controlService.loadAllControls();

      await expect(promise2).rejects.toThrow('Controls are already being loaded');
      await promise1;
    });
  });

  describe('control retrieval', () => {
    beforeEach(async () => {
      const mockISMControls: ISMControl[] = [
        {
          id: 'ism-001',
          title: 'Test ISM Control 1',
          description: 'First test control',
          implementationGuidance: 'Test guidance',
          controlFamily: 'Security',
          riskLevel: 'HIGH',
          source: 'ISM'
        },
        {
          id: 'ism-002',
          title: 'Test ISM Control 2',
          description: 'Second test control',
          implementationGuidance: 'Test guidance',
          controlFamily: 'Privacy',
          riskLevel: 'LOW',
          source: 'ISM'
        }
      ];

      mockOSCALParser.loadISMControls.mockResolvedValueOnce(mockISMControls);
      mockOSCALParser.loadNISTControls.mockResolvedValueOnce([]);

      await controlService.loadAllControls();
    });

    it('should retrieve ISM control by ID', () => {
      const control = controlService.getISMControlById('ism-001');
      expect(control).toBeDefined();
      expect(control?.title).toBe('Test ISM Control 1');
    });

    it('should return undefined for non-existent control ID', () => {
      const control = controlService.getISMControlById('non-existent');
      expect(control).toBeUndefined();
    });

    it('should search ISM controls by text', () => {
      const results = controlService.searchISMControls('first');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('ism-001');
    });

    it('should get controls by family', () => {
      const securityControls = controlService.getISMControlsByFamily('Security');
      expect(securityControls).toHaveLength(1);
      expect(securityControls[0].id).toBe('ism-001');
    });

    it('should get unique control families', () => {
      const families = controlService.getISMControlFamilies();
      expect(families).toEqual(['Privacy', 'Security']);
    });
  });

  describe('isReady', () => {
    it('should return true when both ISM and NIST controls are loaded', async () => {
      mockOSCALParser.loadISMControls.mockResolvedValueOnce([]);
      mockOSCALParser.loadNISTControls.mockResolvedValueOnce([]);

      await controlService.loadAllControls();
      expect(controlService.isReady()).toBe(true);
    });

    it('should return false when controls are not loaded', () => {
      expect(controlService.isReady()).toBe(false);
    });
  });
});