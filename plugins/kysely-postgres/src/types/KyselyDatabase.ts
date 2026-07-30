/**
 * The schema Kysely queries against. Declare it once in your database interface file so
 * every service, plus the plugin's own `connection`, can resolve its table names from it.
 *
 * @example
 * ```typescript
 * declare module '@seedcord/plugin-kysely-postgres' {
 *   interface KyselyDatabase {
 *     schema: MyDatabase;
 *   }
 * }
 * ```
 */
export interface KyselyDatabase {}

/**
 * The declared schema. Until {@link KyselyDatabase} declares a `schema` this resolves to
 * `Record<string, never>`, which widens {@link KyselyTable} to `string`, so any table name type-checks.
 */
export type KyselySchema = KyselyDatabase extends { schema: infer Declared extends object }
    ? Declared
    : Record<string, never>;

/** Every table name in the declared schema. */
export type KyselyTable = keyof KyselySchema;
