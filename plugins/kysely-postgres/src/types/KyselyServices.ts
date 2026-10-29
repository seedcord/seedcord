import type { KyselyPostgres } from '#src/KyselyPostgres';
import type { Generated } from '@seedcord/core/plugin';

type FoundServices = Generated<typeof KyselyPostgres>['services'];

type ServiceInstances = { [Key in keyof FoundServices]: InstanceType<FoundServices[Key]> };

/**
 * Every service you register with `@RegisterKyselyService`, by its key. `seedcord codegen` fills this in.
 * Before codegen first runs, it accepts any key and types each one as `object`.
 */
export interface KyselyServices extends ServiceInstances {}

/** @internal */
export type KyselyServiceKeys = keyof KyselyServices;
