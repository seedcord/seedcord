import type { KyselyPostgres } from '#src/KyselyPostgres';
import type { Generated } from '@seedcord/core/plugin';

type FoundServices = Generated<typeof KyselyPostgres>['services'];

// a stale row makes FoundServices codegen's message. TypeScript prints these keys in the decorator's error
type ServiceInstances = FoundServices extends string
    ? Record<FoundServices, never>
    : { [Key in keyof FoundServices]: InstanceType<FoundServices[Key]> };

/**
 * Every service you register with `@RegisterKyselyService`, by its key. `seedcord codegen` fills this in.
 */
export interface KyselyServices extends ServiceInstances {}

/** @internal */
export type KyselyServiceKeys = keyof KyselyServices;
