/**
 * Extra configuration supplied to `@RegisterMongooseService`.
 */
export interface MongooseServiceRegistrationOptions {
    /**
     * Optional override for the mongoose model name. Mongoose derives the collection from it by
     * pluralizing, so `user` reads and writes the `users` collection.
     *
     * Set this when the model name differs from the service key.
     *
     * @defaultValue the provided key
     */
    readonly modelName?: string;
}
