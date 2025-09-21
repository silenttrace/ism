export interface ISMControl {
  id: string;
  title: string;
  description: string;
  implementationGuidance: string;
  controlFamily: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  source: 'ISM';
  parts?: ControlPart[];
  properties?: ControlProperty[];
}

export interface NISTControl {
  id: string;
  title: string;
  description: string;
  family: string;
  class: string;
  source: 'NIST-800-53';
  parts?: ControlPart[];
  properties?: ControlProperty[];
}

export interface ControlPart {
  id?: string;
  name: string;
  prose?: string;
  parts?: ControlPart[];
}

export interface ControlProperty {
  name: string;
  value: string;
  class?: string;
}

export interface OSCALCatalog {
  catalog: {
    uuid: string;
    metadata: {
      title: string;
      'last-modified': string;
      version: string;
      'oscal-version': string;
    };
    groups?: OSCALGroup[];
    controls?: OSCALControl[];
  };
}

export interface OSCALGroup {
  id: string;
  title?: string;
  controls?: OSCALControl[];
  groups?: OSCALGroup[]; // Groups can be nested
}

export interface OSCALControl {
  id: string;
  title: string;
  params?: OSCALParameter[];
  props?: ControlProperty[];
  parts?: ControlPart[];
}

export interface OSCALParameter {
  id: string;
  label?: string;
  usage?: string;
  constraints?: any[];
  guidelines?: any[];
}

export type Control = ISMControl | NISTControl;