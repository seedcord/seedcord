export * from './HealthCheck';
export * from './Lifecycle';
export * from './Logger';
export * from './StrictEventEmitter';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
