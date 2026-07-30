export { Mongoose } from './Mongoose';
export { MongooseService } from './MongooseService';

export { RegisterMongooseModel } from './decorators/RegisterMongooseModel';
export { RegisterMongooseService } from './decorators/RegisterMongooseService';

export type * from './types/MongooseDocument';
export type { MongooseOptions } from './types/MongooseOptions';
export type { MongooseServices } from './types/MongooseServices';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
