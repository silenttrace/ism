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

export interface ControlLoadingStatus {
  isLoading: boolean;
  ismControlsLoaded: boolean;
  nistControlsLoaded: boolean;
  ismControlCount: number;
  nistControlCount: number;
  lastLoadTime?: string;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type Control = ISMControl | NISTControl;