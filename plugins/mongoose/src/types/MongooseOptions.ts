import type mongoose from 'mongoose';

/**
 * Configuration options for MongoDB connection and service loading.
 */
export interface MongooseOptions {
    /** Folder holding your service classes, subfolders included. A relative path resolves against `root` from `seedcord.config.ts`. */
    path: string;
    /** MongoDB connection URI */
    uri: string;
    /** Database name to use */
    name: string;
    /** mongoose connection options */
    connectionOptions?: mongoose.ConnectOptions | undefined;
    /**
     * How long disconnecting may take during shutdown, in milliseconds.
     *
     * @defaultValue `10_000`
     */
    timeout?: number;
}
