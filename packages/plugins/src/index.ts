export * from './mongo';
export * from './kysely-pg';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
