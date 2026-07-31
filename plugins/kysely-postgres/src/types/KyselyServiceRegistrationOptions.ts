/**
 * Extra configuration supplied to `@RegisterKyselyService`.
 */
export interface KyselyServiceRegistrationOptions<TTable extends string = string> {
    /**
     * Optional override for the table name exposed via the service. It has to match the table the
     * service class specifies as its type argument.
     *
     * Set this when the table name differs from the service key.
     *
     * @defaultValue the provided key
     */
    readonly table?: TTable;
}
