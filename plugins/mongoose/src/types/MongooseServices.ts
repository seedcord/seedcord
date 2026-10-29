import type { Mongoose } from '#src/Mongoose';
import type { Generated } from '@seedcord/core/plugin';

type FoundServices = Generated<typeof Mongoose>['services'];

type ServiceInstances = { [Key in keyof FoundServices]: InstanceType<FoundServices[Key]> };

/**
 * Every service you register with `@RegisterMongooseService`, by its key. `seedcord codegen` fills this in.
 * Before codegen first runs, it accepts any key and types each one as `object`.
 */
export interface MongooseServices extends ServiceInstances {}

export type MongooseServiceKeys = keyof MongooseServices;
