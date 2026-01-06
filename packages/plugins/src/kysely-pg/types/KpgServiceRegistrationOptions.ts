/**
 * Extra configuration supplied to `@RegisterKpgService`.
 */
export interface KpgServiceRegistrationOptions {
    /**
     * Optional override for the table name exposed via the service. Defaults to the provided key.
     *
     * You should set this if your table name does not match the service key.
     */
    table?: string;
}
