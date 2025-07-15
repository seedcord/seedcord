// This interface can be augmented via declaration merging
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Services {}

// Helper type to extract service keys
export type ServiceKeys = keyof Services;
