import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { KyselyServiceMetadataKey, KyselyTableMetadataKey } from './decorators/RegisterKyselyService';

import type { KyselyPostgres } from './KyselyPostgres';
import type { KyselySchema, KyselyTable } from './types/KyselyDatabase';
import type { CoreBase } from '@seedcord/core';
import type { TypedConstructor } from '@seedcord/types';
import type { Kysely } from 'kysely';
import type { LiteralUnion } from 'type-fest';

/**
 * Base class for KyselyPostgres services.
 *
 * Provides a small, typed shim around the shared Kysely instance and ensures
 * that subclasses have been decorated with `@RegisterKyselyService`.
 *
 * @typeParam TTable - The table this service works with. Defaults to every table in the schema.
 *
 * @example
 * ```typescript
 * \@RegisterKyselyService('users')
 * export class UsersService extends KyselyService<'users'> {
 *   public async findById(id: string) {
 *     return this.db
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
export abstract class KyselyService<TTable extends LiteralUnion<KyselyTable, string> = KyselyTable> {
    public readonly table: TTable;

    public constructor(
        protected readonly kysely: KyselyPostgres,
        protected readonly core: CoreBase
    ) {
        const ctor = this.constructor;

        const key = Reflect.getMetadata(KyselyServiceMetadataKey, ctor) as string | undefined;
        if (!key) {
            throw new SeedcordError(SeedcordErrorCode.PluginKyselyServiceDecoratorMissing, [ctor.name]);
        }

        const table = Reflect.getMetadata(KyselyTableMetadataKey, ctor) as TTable | undefined;

        // the decorator always writes a table with the key, so this only fires if it was bypassed
        if (!table) {
            throw new SeedcordError(SeedcordErrorCode.PluginKyselyServiceTableMissing, [ctor.name]);
        }

        this.table = table;
        this.kysely._register(key, this);
    }

    /**
     * Shared Kysely instance used to interact with the Postgres database.
     */
    public get db(): Kysely<KyselySchema> {
        return this.kysely.connection;
    }
}

/** Constructor type for {@link KyselyService} classes */
export type KyselyServiceConstructor = TypedConstructor<typeof KyselyService<KyselyTable>>;
