export { Mongoose } from './Mongoose';
export { MongooseService } from './MongooseService';

export { RegisterMongooseService } from './decorators/RegisterMongooseService';

export type * from './types/MongooseDocument';
export type { MongooseOptions } from './types/MongooseOptions';
export type { MongooseServiceRegistrationOptions } from './types/MongooseServiceRegistrationOptions';
export type { MongooseServices } from './types/MongooseServices';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
