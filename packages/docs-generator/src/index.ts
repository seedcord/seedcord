export { ApiDocsGenerator } from './generator';
export type { ApiDocsGeneratorOptions, ApiDocsGeneratorResult } from './generator';
export type * from './types';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
