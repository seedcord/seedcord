/**
 * Extra configuration supplied to `@RegisterKpgService`.
 */
export interface KpgServiceRegistrationOptions {
    /**
     * Optional override for the table name exposed via the service.
     *
     * You should set this if your table name does not match the service key.
     *
     * @defaultValue the provided key
     */
    table?: string;
}
