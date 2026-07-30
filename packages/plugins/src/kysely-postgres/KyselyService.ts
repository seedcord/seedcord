import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { KyselyServiceMetadataKey, KyselyTableMetadataKey } from './decorators/RegisterKyselyService';

import type { KyselyPostgres } from './KyselyPostgres';
import type { Core } from '@seedcord/gateway';
import type { TypedConstructor } from '@seedcord/types';
import type { Kysely } from 'kysely';
import type { LiteralUnion } from 'type-fest';

/**
 * Base class for KyselyPostgres services.
 *
 * Provides a small, typed shim around the shared Kysely instance and ensures
 * that subclasses have been decorated with `@RegisterKyselyService`.
 *
 * @typeParam Database - The database shape used by Kysely (tables as keys).
 * @typeParam TTable - The specific table key from `Database` this service works with.
 *
 * @example
 * ```typescript
 * \@RegisterKyselyService('users')
 * export class UsersService extends KyselyService<ImportedDatabaseInterface, 'users'> {
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
export abstract class KyselyService<Database extends object, TTable extends LiteralUnion<keyof Database, string>> {
    public readonly table: TTable;

    public constructor(
        protected readonly kysely: KyselyPostgres<Database>,
        protected readonly core: Core
    ) {
        const ctor = this.constructor;

        const key = Reflect.getMetadata(KyselyServiceMetadataKey, ctor) as string | undefined;
        if (!key) {
            throw new SeedcordError(SeedcordErrorCode.PluginKyselyServiceDecoratorMissing, [ctor.name]);
        }

        const table = Reflect.getMetadata(KyselyTableMetadataKey, ctor) as TTable | undefined;

        // This check should always pass since TTable is derived from the key if a table is not provided explicitly.
        if (!table) {
            throw new SeedcordError(SeedcordErrorCode.PluginKyselyServiceTableMissing, [ctor.name]);
        }

        this.table = table;
        this.kysely._register(key, this);
    }

    /**
     * Shared Kysely instance used to interact with the Postgres database.
     */
    public get db(): Kysely<Database> {
        return this.kysely.connection;
    }
}

/** Constructor type for {@link KyselyService} classes */
export type KyselyServiceConstructor<Database extends object = object> = TypedConstructor<
    typeof KyselyService<Database, keyof Database & string>
>;
