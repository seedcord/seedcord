export { KyselyService } from './KyselyService';
export { KyselyPostgres } from './KyselyPostgres';

export { RegisterKyselyService } from './decorators/RegisterKyselyService';

export type { MigrationOptions, MigrationTarget, StepMigrationOptions } from './types/KyselyMigration';
export type { KyselyOptions, KyselyMigrationsOptions } from './types/KyselyOptions';
export type { KyselyServiceRegistrationOptions } from './types/KyselyServiceRegistrationOptions';
export type { KyselyServices } from './types/KyselyServices';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
