import { ISMControl, NISTControl } from '../models/Control';
import { OSCALParser } from './OSCALParser';
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'info',
  format: require('winston').format.json(),
  transports: [
    new (require('winston').transports.Console)()
  ]
});

export interface ControlLoadingStatus {
  isLoading: boolean;
  ismControlsLoaded: boolean;
  nistControlsLoaded: boolean;
  ismControlCount: number;
  nistControlCount: number;
  lastLoadTime?: Date;
  error?: string;
}

export class ControlService {
  private static instance: ControlService;
  private ismControls: ISMControl[] = [];
  private nistControls: NISTControl[] = [];
  private oscalParser: OSCALParser;
  private loadingStatus: ControlLoadingStatus = {
    isLoading: false,
    ismControlsLoaded: false,
    nistControlsLoaded: false,
    ismControlCount: 0,
    nistControlCount: 0
  };

  private constructor() {
    this.oscalParser = new OSCALParser();
  }

  public static getInstance(): ControlService {
    if (!ControlService.instance) {
      ControlService.instance = new ControlService();
    }
    return ControlService.instance;
  }

  /**
   * Load all controls (ISM and NIST)
   */
  async loadAllControls(): Promise<void> {
    if (this.loadingStatus.isLoading) {
      throw new Error('Controls are already being loaded');
    }

    this.loadingStatus.isLoading = true;
    this.loadingStatus.error = undefined;

    try {
      logger.info('Starting to load all controls...');

      // Load ISM controls
      await this.loadISMControls();

      // Load NIST controls for reference
      await this.loadNISTControls();

      this.loadingStatus.lastLoadTime = new Date();
      logger.info('Successfully loaded all controls');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.loadingStatus.error = errorMessage;
      logger.error('Failed to load controls:', error);
      throw error;
    } finally {
      this.loadingStatus.isLoading = false;
    }
  }

  /**
   * Load ISM controls only
   */
  async loadISMControls(): Promise<void> {
    try {
      logger.info('Loading ISM controls...');
      this.ismControls = await this.oscalParser.loadISMControls();
      this.loadingStatus.ismControlsLoaded = true;
      this.loadingStatus.ismControlCount = this.ismControls.length;
      logger.info(`Loaded ${this.ismControls.length} ISM controls`);
    } catch (error) {
      this.loadingStatus.ismControlsLoaded = false;
      this.loadingStatus.ismControlCount = 0;
      throw error;
    }
  }

  /**
   * Load NIST controls only
   */
  async loadNISTControls(): Promise<void> {
    try {
      logger.info('Loading NIST controls...');
      this.nistControls = await this.oscalParser.loadNISTControls();
      this.loadingStatus.nistControlsLoaded = true;
      this.loadingStatus.nistControlCount = this.nistControls.length;
      logger.info(`Loaded ${this.nistControls.length} NIST controls`);
    } catch (error) {
      this.loadingStatus.nistControlsLoaded = false;
      this.loadingStatus.nistControlCount = 0;
      throw error;
    }
  }

  /**
   * Get all ISM controls
   */
  getISMControls(): ISMControl[] {
    return [...this.ismControls];
  }

  /**
   * Get all NIST controls
   */
  getNISTControls(): NISTControl[] {
    return [...this.nistControls];
  }

  /**
   * Get ISM control by ID
   */
  getISMControlById(id: string): ISMControl | undefined {
    return this.ismControls.find(control => control.id === id);
  }

  /**
   * Get NIST control by ID
   */
  getNISTControlById(id: string): NISTControl | undefined {
    return this.nistControls.find(control => control.id === id);
  }

  /**
   * Search ISM controls by text
   */
  searchISMControls(query: string): ISMControl[] {
    const lowerQuery = query.toLowerCase();
    return this.ismControls.filter(control =>
      control.id.toLowerCase().includes(lowerQuery) ||
      control.title.toLowerCase().includes(lowerQuery) ||
      control.description.toLowerCase().includes(lowerQuery) ||
      control.controlFamily.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Search NIST controls by text
   */
  searchNISTControls(query: string): NISTControl[] {
    const lowerQuery = query.toLowerCase();
    return this.nistControls.filter(control =>
      control.id.toLowerCase().includes(lowerQuery) ||
      control.title.toLowerCase().includes(lowerQuery) ||
      control.description.toLowerCase().includes(lowerQuery) ||
      control.family.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get controls by family/group
   */
  getISMControlsByFamily(family: string): ISMControl[] {
    return this.ismControls.filter(control => 
      control.controlFamily.toLowerCase() === family.toLowerCase()
    );
  }

  /**
   * Get NIST controls by family
   */
  getNISTControlsByFamily(family: string): NISTControl[] {
    return this.nistControls.filter(control => 
      control.family.toLowerCase() === family.toLowerCase()
    );
  }

  /**
   * Get unique control families
   */
  getISMControlFamilies(): string[] {
    const families = new Set(this.ismControls.map(control => control.controlFamily));
    return Array.from(families).sort();
  }

  /**
   * Get unique NIST control families
   */
  getNISTControlFamilies(): string[] {
    const families = new Set(this.nistControls.map(control => control.family));
    return Array.from(families).sort();
  }

  /**
   * Get loading status
   */
  getLoadingStatus(): ControlLoadingStatus {
    return { ...this.loadingStatus };
  }

  /**
   * Check if controls are ready for processing
   */
  isReady(): boolean {
    return this.loadingStatus.ismControlsLoaded && this.loadingStatus.nistControlsLoaded;
  }

  /**
   * Reset all loaded data
   */
  reset(): void {
    this.ismControls = [];
    this.nistControls = [];
    this.loadingStatus = {
      isLoading: false,
      ismControlsLoaded: false,
      nistControlsLoaded: false,
      ismControlCount: 0,
      nistControlCount: 0
    };
    logger.info('Control service reset');
  }
}