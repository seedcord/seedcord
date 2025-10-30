import { PgServiceMetadataKey, PgTableMetadataKey } from './decorators/RegisterKpgService';

import type { KyselyPg } from './KyselyPg';
import type { AnyKpgService, KpgServices } from './types/KpgServices';
import type { Kysely } from 'kysely';
import type { Core, TypedConstructor } from 'seedcord';

/**
 * Base class for KyselyPg services.
 *
 * Provides a small, typed shim around the shared Kysely instance and ensures
 * that subclasses have been decorated with `@RegisterKpgService`.
 *
 * @typeParam Database - The database shape used by Kysely (tables as keys).
 * @typeParam TTable - The specific table key from `Database` this service works with.
 *
 * @example
 * ```typescript
 * \@RegisterKpgService('users')
 * export class UsersService extends KpgService<ImportedDatabaseInterface, 'users'> {
 *   public async findById(id: string) {
 *     return this.entity
 *       .selectFrom(this.table)
 *       .selectAll().where('id', '=', id)
 *       .executeTakeFirst();
 *   }
 * }
 *
 * // Usage inside handlers:
 * const user = await this.core.db.services.users.findById('abc');
 * ```
 */
export abstract class KpgService<Database extends object, TTable extends keyof Database & string> {
    public readonly table: TTable;

    public constructor(
        protected readonly kysely: KyselyPg<Database>,
        protected readonly core: Core
    ) {
        const ctor = this.constructor;

        const key = Reflect.getMetadata(PgServiceMetadataKey, ctor) as string | undefined;
        if (!key) throw new Error(`Missing @RegisterKpgService on ${ctor.name}`);

        const table = Reflect.getMetadata(PgTableMetadataKey, ctor) as TTable | undefined;

        // This check should always pass since TTable is derived from the key if a table is not provided explicitly.
        if (!table) {
            throw new Error(`Missing table metadata for ${ctor.name}. Provide a table via @RegisterKpgService().`);
        }

        this.table = table;
        this.kysely._register(key as keyof KpgServices, this as unknown as AnyKpgService);
    }

    /**
     * Shared Kysely instance used to interact with the Postgres database.
     */
    public get db(): Kysely<Database> {
        return this.kysely.connection;
    }
}

/** Constructor type for {@link KpgService} classes */
export type KyselyServiceConstructor<Database extends object = object> = TypedConstructor<
    typeof KpgService<Database, keyof Database & string>
>;
