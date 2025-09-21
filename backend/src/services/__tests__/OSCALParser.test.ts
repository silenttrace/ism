import { OSCALParser } from '../OSCALParser';
import { OSCALCatalog } from '../../models/Control';

// Mock axios to avoid actual HTTP requests in tests
jest.mock('axios');
const mockedAxios = jest.mocked(require('axios'));

describe('OSCALParser', () => {
  let parser: OSCALParser;

  beforeEach(() => {
    parser = new OSCALParser();
    jest.clearAllMocks();
  });

  describe('validateOSCALCatalog', () => {
    it('should validate a proper OSCAL catalog structure', () => {
      const validCatalog = {
        catalog: {
          metadata: {
            title: 'Test Catalog',
            'last-modified': '2023-01-01T00:00:00Z',
            version: '1.0',
            'oscal-version': '1.0.0'
          },
          controls: [
            {
              id: 'test-1',
              title: 'Test Control',
              parts: []
            }
          ]
        }
      };

      expect(parser.validateOSCALCatalog(validCatalog)).toBe(true);
    });

    it('should reject invalid OSCAL catalog structure', () => {
      const invalidCatalog = {
        notCatalog: {}
      };

      expect(parser.validateOSCALCatalog(invalidCatalog)).toBe(false);
    });

    it('should reject null or undefined input', () => {
      expect(parser.validateOSCALCatalog(null)).toBe(false);
      expect(parser.validateOSCALCatalog(undefined)).toBe(false);
    });
  });

  describe('loadISMControls', () => {
    it('should successfully load and parse ISM controls', async () => {
      const mockCatalog: OSCALCatalog = {
        catalog: {
          uuid: 'test-uuid',
          metadata: {
            title: 'ISM Catalog',
            'last-modified': '2023-01-01T00:00:00Z',
            version: '1.0',
            'oscal-version': '1.0.0'
          },
          controls: [
            {
              id: 'ism-001',
              title: 'Test ISM Control',
              parts: [
                {
                  name: 'statement',
                  prose: 'This is a test control description'
                }
              ],
              props: [
                {
                  name: 'risk-level',
                  value: 'HIGH'
                }
              ]
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockCatalog });

      const controls = await parser.loadISMControls();

      expect(controls).toHaveLength(1);
      expect(controls[0]).toMatchObject({
        id: 'ism-001',
        title: 'Test ISM Control',
        description: 'This is a test control description',
        riskLevel: 'HIGH',
        source: 'ISM'
      });
    });

    it('should handle network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(parser.loadISMControls()).rejects.toThrow('Failed to load ISM controls');
    });
  });

  describe('loadNISTControls', () => {
    it('should successfully load and parse NIST controls', async () => {
      const mockCatalog: OSCALCatalog = {
        catalog: {
          uuid: 'test-uuid',
          metadata: {
            title: 'NIST SP 800-53',
            'last-modified': '2023-01-01T00:00:00Z',
            version: '5.0',
            'oscal-version': '1.0.0'
          },
          groups: [
            {
              id: 'ac',
              title: 'Access Control',
              controls: [
                {
                  id: 'ac-1',
                  title: 'Access Control Policy and Procedures',
                  parts: [
                    {
                      name: 'statement',
                      prose: 'Develop, document, and disseminate access control policy'
                    }
                  ],
                  props: [
                    {
                      name: 'class',
                      value: 'operational'
                    }
                  ]
                }
              ]
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockCatalog });

      const controls = await parser.loadNISTControls();

      expect(controls).toHaveLength(1);
      expect(controls[0]).toMatchObject({
        id: 'ac-1',
        title: 'Access Control Policy and Procedures',
        description: 'Develop, document, and disseminate access control policy',
        family: 'Access Control',
        class: 'operational',
        source: 'NIST-800-53'
      });
    });
  });
});