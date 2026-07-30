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
 * The declared schema. Resolves to an empty shape until {@link KyselyDatabase} carries a `schema`,
 * where every table name is then rejected.
 */
export type KyselySchema = KyselyDatabase extends { schema: infer Declared extends object }
    ? Declared
    : Record<string, never>;

/** Every table name in the declared schema. */
export type KyselyTable = keyof KyselySchema;
