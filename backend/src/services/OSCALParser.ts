import axios from 'axios';
import { createLogger } from 'winston';
import { 
  ISMControl, 
  NISTControl, 
  OSCALCatalog, 
  OSCALControl, 
  OSCALGroup,
  ControlPart,
  ControlProperty 
} from '../models/Control';

const logger = createLogger({
  level: 'info',
  format: require('winston').format.json(),
  transports: [
    new (require('winston').transports.Console)()
  ]
});

export class OSCALParser {
  private static readonly ISM_CATALOG_URL = 'https://www.cyber.gov.au/ism/oscal/v2025.09.10/artifacts/ISM_catalog.json';
  private static readonly NIST_CATALOG_URL = 'https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json';

  /**
   * Load and parse ISM controls from the official OSCAL catalog
   */
  async loadISMControls(): Promise<ISMControl[]> {
    try {
      logger.info('Loading ISM controls from OSCAL catalog...');
      logger.info(`Fetching from URL: ${OSCALParser.ISM_CATALOG_URL}`);
      
      const response = await axios.get(OSCALParser.ISM_CATALOG_URL, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ISM-NIST-Mapper/1.0'
        }
      });

      logger.info(`Received response with status: ${response.status}`);
      logger.info(`Response content type: ${response.headers['content-type']}`);
      
      if (!response.data) {
        throw new Error('No data received from ISM catalog URL');
      }

      // Validate basic structure
      if (!response.data.catalog) {
        logger.error('Invalid OSCAL structure - missing catalog property');
        logger.error('Response data keys:', Object.keys(response.data));
        throw new Error('Invalid OSCAL catalog structure - missing catalog property');
      }

      const catalog: OSCALCatalog = response.data;
      const controls = this.parseISMControls(catalog);
      
      logger.info(`Successfully loaded ${controls.length} ISM controls`);
      return controls;
    } catch (error) {
      logger.error('Failed to load ISM controls:', error);
      if (error instanceof Error) {
        logger.error('Error details:', error.stack);
      }
      throw new Error(`Failed to load ISM controls: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load and parse NIST 800-53 controls for reference
   */
  async loadNISTControls(): Promise<NISTControl[]> {
    try {
      logger.info('Loading NIST 800-53 controls from OSCAL catalog...');
      const response = await axios.get(OSCALParser.NIST_CATALOG_URL, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ISM-NIST-Mapper/1.0'
        }
      });

      const catalog: OSCALCatalog = response.data;
      const controls = this.parseNISTControls(catalog);
      
      logger.info(`Successfully loaded ${controls.length} NIST controls`);
      return controls;
    } catch (error) {
      logger.error('Failed to load NIST controls:', error);
      throw new Error(`Failed to load NIST controls: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process groups recursively to find all controls
   */
  private processGroups(groups: OSCALGroup[], controls: ISMControl[], parentTitle?: string): void {
    for (const group of groups) {
      const groupTitle = group.title || group.id;
      const fullTitle = parentTitle ? `${parentTitle} - ${groupTitle}` : groupTitle;
      
      logger.debug(`Processing group: ${fullTitle}`);
      logger.debug(`Group keys:`, Object.keys(group));
      
      // Process controls in this group
      if (group.controls && group.controls.length > 0) {
        logger.info(`Group "${fullTitle}" has ${group.controls.length} controls`);
        for (const control of group.controls) {
          const ismControl = this.convertOSCALToISMControl(control, fullTitle);
          if (ismControl) {
            controls.push(ismControl);
          }
        }
      }
      
      // Process nested groups
      if (group.groups && group.groups.length > 0) {
        logger.info(`Group "${fullTitle}" has ${group.groups.length} nested groups`);
        this.processGroups(group.groups, controls, fullTitle);
      }
      
      if (!group.controls && !group.groups) {
        logger.debug(`Group "${fullTitle}" has no controls or nested groups`);
      }
    }
  }

  /**
   * Parse ISM controls from OSCAL catalog format
   */
  private parseISMControls(catalog: OSCALCatalog): ISMControl[] {
    const controls: ISMControl[] = [];

    try {
      logger.info('Parsing ISM controls from OSCAL catalog...');
      logger.debug('Catalog keys:', Object.keys(catalog.catalog));
      
      // Log first group structure to understand the format
      if (catalog.catalog.groups && catalog.catalog.groups.length > 0) {
        logger.debug('First group structure:', JSON.stringify(catalog.catalog.groups[0], null, 2).substring(0, 2000));
      }

      // Handle controls at catalog level
      if (catalog.catalog.controls) {
        logger.info(`Found ${catalog.catalog.controls.length} controls at catalog level`);
        for (const control of catalog.catalog.controls) {
          const ismControl = this.convertOSCALToISMControl(control);
          if (ismControl) {
            controls.push(ismControl);
          }
        }
      }

      // Handle controls within groups (including nested groups)
      if (catalog.catalog.groups) {
        logger.info(`Found ${catalog.catalog.groups.length} groups`);
        this.processGroups(catalog.catalog.groups, controls);
      }

      logger.info(`Successfully parsed ${controls.length} ISM controls`);
      return controls;
    } catch (error) {
      logger.error('Error parsing ISM controls:', error);
      logger.error('Catalog keys:', Object.keys(catalog));
      if (catalog.catalog) {
        logger.error('Catalog.catalog keys:', Object.keys(catalog.catalog));
      }
      throw new Error('Failed to parse ISM controls from OSCAL format');
    }
  }

  /**
   * Parse NIST controls from OSCAL catalog format
   */
  private parseNISTControls(catalog: OSCALCatalog): NISTControl[] {
    const controls: NISTControl[] = [];

    try {
      // Handle controls at catalog level
      if (catalog.catalog.controls) {
        for (const control of catalog.catalog.controls) {
          const nistControl = this.convertOSCALToNISTControl(control);
          if (nistControl) {
            controls.push(nistControl);
          }
        }
      }

      // Handle controls within groups
      if (catalog.catalog.groups) {
        for (const group of catalog.catalog.groups) {
          if (group.controls) {
            for (const control of group.controls) {
              const nistControl = this.convertOSCALToNISTControl(control, group.title, group.id);
              if (nistControl) {
                controls.push(nistControl);
              }
            }
          }
        }
      }

      return controls;
    } catch (error) {
      logger.error('Error parsing NIST controls:', error);
      throw new Error('Failed to parse NIST controls from OSCAL format');
    }
  }

  /**
   * Convert OSCAL control to ISM control format
   */
  private convertOSCALToISMControl(oscalControl: OSCALControl, groupTitle?: string): ISMControl | null {
    try {
      logger.debug(`Converting control: ${oscalControl.id}`);
      
      const description = this.extractDescription(oscalControl.parts);
      const implementationGuidance = this.extractImplementationGuidance(oscalControl.parts);
      const riskLevel = this.extractRiskLevel(oscalControl.props);

      const ismControl: ISMControl = {
        id: oscalControl.id,
        title: oscalControl.title || 'Untitled Control',
        description: description || 'No description available',
        implementationGuidance: implementationGuidance || 'No implementation guidance available',
        controlFamily: groupTitle || 'Unknown',
        riskLevel,
        source: 'ISM',
        parts: oscalControl.parts,
        properties: oscalControl.props
      };

      logger.debug(`Successfully converted control: ${ismControl.id}`);
      return ismControl;
    } catch (error) {
      logger.warn(`Failed to convert OSCAL control ${oscalControl.id}:`, error);
      logger.warn('Control structure:', JSON.stringify(oscalControl, null, 2).substring(0, 500));
      return null;
    }
  }

  /**
   * Convert OSCAL control to NIST control format
   */
  private convertOSCALToNISTControl(oscalControl: OSCALControl, groupTitle?: string, groupId?: string): NISTControl | null {
    try {
      const description = this.extractDescription(oscalControl.parts);
      const controlClass = this.extractControlClass(oscalControl.props);

      return {
        id: oscalControl.id,
        title: oscalControl.title,
        description,
        family: groupTitle || 'Unknown',
        class: controlClass,
        source: 'NIST-800-53',
        parts: oscalControl.parts,
        properties: oscalControl.props
      };
    } catch (error) {
      logger.warn(`Failed to convert OSCAL control ${oscalControl.id}:`, error);
      return null;
    }
  }

  /**
   * Extract description from control parts
   */
  private extractDescription(parts?: ControlPart[]): string {
    if (!parts) return '';

    // Look for statement or description parts
    const descriptionPart = parts.find(part => 
      part.name === 'statement' || 
      part.name === 'description' ||
      part.name === 'overview'
    );

    if (descriptionPart?.prose) {
      return descriptionPart.prose;
    }

    // If no specific description part, concatenate all prose
    const allProse = parts
      .filter(part => part.prose)
      .map(part => part.prose)
      .join(' ');

    return allProse || '';
  }

  /**
   * Extract implementation guidance from control parts
   */
  private extractImplementationGuidance(parts?: ControlPart[]): string {
    if (!parts) return '';

    // Look for guidance or implementation parts
    const guidancePart = parts.find(part => 
      part.name === 'guidance' || 
      part.name === 'implementation' ||
      part.name === 'implementation-guidance'
    );

    return guidancePart?.prose || '';
  }

  /**
   * Extract risk level from control properties (ISM specific)
   */
  private extractRiskLevel(props?: ControlProperty[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (!props) return 'MEDIUM';

    const riskProp = props.find(prop => 
      prop.name === 'risk-level' || 
      prop.name === 'priority' ||
      prop.name === 'criticality'
    );

    if (riskProp) {
      const value = riskProp.value.toUpperCase();
      if (value.includes('HIGH') || value.includes('CRITICAL')) return 'HIGH';
      if (value.includes('LOW') || value.includes('BASIC')) return 'LOW';
    }

    return 'MEDIUM';
  }

  /**
   * Extract control class from properties (NIST specific)
   */
  private extractControlClass(props?: ControlProperty[]): string {
    if (!props) return 'operational';

    const classProp = props.find(prop => 
      prop.name === 'class' || 
      prop.name === 'control-class'
    );

    return classProp?.value || 'operational';
  }

  /**
   * Validate OSCAL catalog structure
   */
  validateOSCALCatalog(data: any): boolean {
    try {
      return (
        data &&
        data.catalog &&
        data.catalog.metadata &&
        (data.catalog.controls || data.catalog.groups)
      );
    } catch {
      return false;
    }
  }
}