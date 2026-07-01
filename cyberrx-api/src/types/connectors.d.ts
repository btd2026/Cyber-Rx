/**
 * TypeScript interfaces for CyberRx connector signal schema.
 * Used to validate that demo JSON files match real API response shapes.
 */

export interface ConnectorSignal {
  key: string;
  value: number;
  asOf: string;
  raw: Record<string, unknown>;
}

export interface ConnectorMeta {
  vendor: string;
  [extra: string]: unknown;
}

export interface ConnectorFetchResult {
  signals: ConnectorSignal[];
  meta: ConnectorMeta;
}

export interface ConnectorTestResult {
  ok: boolean;
  detail: string;
}

export interface ConnectorField {
  key: string;
  label: string;
  secret?: boolean;
  optional?: boolean;
}

export interface ConnectorDefinition {
  key: string;
  label: string;
  vendor: string;
  category: string;
  signals: string[];
  scopes: string[];
  fields: ConnectorField[];
  demoMode?: boolean;
  test: (creds: Record<string, string>) => Promise<ConnectorTestResult>;
  fetchSignals: (creds: Record<string, string>) => Promise<ConnectorFetchResult>;
}

export interface DemoValidationResult {
  valid: boolean;
  missing: string[];
  extra: string[];
}
