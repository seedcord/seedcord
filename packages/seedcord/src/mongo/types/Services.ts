// This interface can be augmented via declaration merging
export interface Services {}

// Helper type to extract service keys
export type ServiceKeys = keyof Services;
