/**
 * Extra configuration supplied to `@RegisterKpgService`.
 */
export interface KpgServiceRegistrationOptions {
    /** Optional override for the table name exposed via the service. Defaults to the provided key. */
    table?: string;
}
