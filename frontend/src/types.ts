// Mirrors src/generation/generation.service.ts's GenerationResult on the backend.
export interface AskResponse {
  answer: string;
  citations: string[];
  groundedInContext: boolean;
  truncated: boolean;
}

export type AskErrorKind =
  'validation' | 'unauthorized' | 'unavailable' | 'server' | 'network';

export interface AskError {
  kind: AskErrorKind;
  message: string;
}
