/**
 * Extra configuration supplied to `@RegisterKyselyService`.
 */
export interface KyselyServiceRegistrationOptions<TTable extends string = string> {
    /**
     * Optional override for the table name exposed via the service. It has to match the table the
     * service class names as its type argument.
     *
     * You should set this if your table name does not match the service key.
     *
     * @defaultValue the provided key
     */
    table?: TTable;
}
