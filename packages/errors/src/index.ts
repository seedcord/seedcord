export { SeedcordErrorCode } from './ErrorCodes';
export { paint } from './palette';
export { isSeedcordError, type SeedcordErrorTypeString } from './SeedcordError';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
