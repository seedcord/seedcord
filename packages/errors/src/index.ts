export { SeedcordErrorCode } from './ErrorCodes';
export { isSeedcordError, type BaseSeedcordError, type SeedcordErrorTypeString } from './SeedcordError';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
