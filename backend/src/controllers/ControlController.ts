import { Request, Response } from 'express';
import { ControlService } from '../services/ControlService';
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'info',
  format: require('winston').format.json(),
  transports: [
    new (require('winston').transports.Console)()
  ]
});

export class ControlController {
  private controlService: ControlService;

  constructor() {
    this.controlService = ControlService.getInstance();
  }

  /**
   * Load all controls (ISM and NIST)
   */
  async loadControls(req: Request, res: Response): Promise<void> {
    try {
      logger.info('API request to load controls');
      await this.controlService.loadAllControls();
      
      const status = this.controlService.getLoadingStatus();
      res.json({
        success: true,
        message: 'Controls loaded successfully',
        data: {
          ismControlCount: status.ismControlCount,
          nistControlCount: status.nistControlCount,
          loadTime: status.lastLoadTime
        }
      });
    } catch (error) {
      logger.error('Failed to load controls via API:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load controls'
      });
    }
  }

  /**
   * Get loading status
   */
  async getLoadingStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = this.controlService.getLoadingStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Failed to get loading status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get loading status'
      });
    }
  }

  /**
   * Get all ISM controls
   */
  async getISMControls(req: Request, res: Response): Promise<void> {
    try {
      const controls = this.controlService.getISMControls();
      res.json({
        success: true,
        data: {
          controls,
          count: controls.length
        }
      });
    } catch (error) {
      logger.error('Failed to get ISM controls:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve ISM controls'
      });
    }
  }

  /**
   * Get all NIST controls
   */
  async getNISTControls(req: Request, res: Response): Promise<void> {
    try {
      const controls = this.controlService.getNISTControls();
      res.json({
        success: true,
        data: {
          controls,
          count: controls.length
        }
      });
    } catch (error) {
      logger.error('Failed to get NIST controls:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve NIST controls'
      });
    }
  }

  /**
   * Get ISM control by ID
   */
  async getISMControlById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const control = this.controlService.getISMControlById(id);
      
      if (!control) {
        res.status(404).json({
          success: false,
          error: `ISM control with ID '${id}' not found`
        });
        return;
      }

      res.json({
        success: true,
        data: control
      });
    } catch (error) {
      logger.error('Failed to get ISM control by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve ISM control'
      });
    }
  }

  /**
   * Get NIST control by ID
   */
  async getNISTControlById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const control = this.controlService.getNISTControlById(id);
      
      if (!control) {
        res.status(404).json({
          success: false,
          error: `NIST control with ID '${id}' not found`
        });
        return;
      }

      res.json({
        success: true,
        data: control
      });
    } catch (error) {
      logger.error('Failed to get NIST control by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve NIST control'
      });
    }
  }

  /**
   * Search ISM controls
   */
  async searchISMControls(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Query parameter "q" is required'
        });
        return;
      }

      const controls = this.controlService.searchISMControls(q);
      res.json({
        success: true,
        data: {
          controls,
          count: controls.length,
          query: q
        }
      });
    } catch (error) {
      logger.error('Failed to search ISM controls:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search ISM controls'
      });
    }
  }

  /**
   * Search NIST controls
   */
  async searchNISTControls(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Query parameter "q" is required'
        });
        return;
      }

      const controls = this.controlService.searchNISTControls(q);
      res.json({
        success: true,
        data: {
          controls,
          count: controls.length,
          query: q
        }
      });
    } catch (error) {
      logger.error('Failed to search NIST controls:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search NIST controls'
      });
    }
  }

  /**
   * Get control families
   */
  async getControlFamilies(req: Request, res: Response): Promise<void> {
    try {
      const ismFamilies = this.controlService.getISMControlFamilies();
      const nistFamilies = this.controlService.getNISTControlFamilies();
      
      res.json({
        success: true,
        data: {
          ism: ismFamilies,
          nist: nistFamilies
        }
      });
    } catch (error) {
      logger.error('Failed to get control families:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve control families'
      });
    }
  }
}