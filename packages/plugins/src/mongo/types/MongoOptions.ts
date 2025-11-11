import type mongoose from 'mongoose';

/**
 * Configuration options for MongoDB connection and service loading.
 */
export interface MongoOptions {
    /** Directory path containing database service classes */
    dir: string;
    /** MongoDB connection URI */
    uri: string;
    /** Database name to use */
    name: string;
    /** mongoose connection options */
    connectionOptions?: mongoose.ConnectOptions | undefined;
    /** Plugin timeout in milliseconds */
    timeout?: number;
}
