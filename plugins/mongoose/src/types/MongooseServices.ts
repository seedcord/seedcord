import type { Mongoose } from '#src/Mongoose';
import type { Generated } from '@seedcord/core/plugin';

type FoundServices = Generated<typeof Mongoose>['services'];

// a stale row makes FoundServices codegen's message. TypeScript prints these keys in the decorator's error
type ServiceInstances = FoundServices extends string
    ? Record<FoundServices, never>
    : { [Key in keyof FoundServices]: InstanceType<FoundServices[Key]> };

/**
 * Every service you register with `@RegisterMongooseService`, by its key. `seedcord codegen` fills this in.
 */
export interface MongooseServices extends ServiceInstances {}

export type MongooseServiceKeys = keyof MongooseServices;
