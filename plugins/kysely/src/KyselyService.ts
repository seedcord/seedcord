import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { KyselyServiceMetadataKey, KyselyTableMetadataKey } from './decorators/RegisterKyselyService';

import type { Kysely } from './Kysely';
import type { KyselySchema, KyselyTable } from './types/KyselyDatabase';
import type { CoreBase } from '@seedcord/core';
import type { TypedConstructor } from '@seedcord/types';
import type { Kysely as KyselyClient } from 'kysely';
import type { LiteralUnion } from 'type-fest';

/**
 * Base class for Kysely services.
 *
 * Provides a small, typed shim around the shared Kysely instance and ensures
 * that subclasses have been decorated with `@RegisterKyselyService`.
 *
 * @typeParam TTable - The table that this service works with. Defaults to every table in the schema.
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
        protected readonly kysely: Kysely,
        protected readonly core: CoreBase
    ) {
        const ctor = this.constructor;

        if (!Reflect.hasMetadata(KyselyServiceMetadataKey, ctor)) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginServiceDecoratorMissing, [
                '@RegisterKyselyService',
                ctor.name
            ]);
        }

        const table = Reflect.getMetadata(KyselyTableMetadataKey, ctor) as TTable | undefined;

        // the decorator always writes a table with the key. this only throws if something bypassed it
        if (!table) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginKyselyServiceTableMissing, [ctor.name]);
        }

        this.table = table;
    }

    /**
     * Shared Kysely instance used to interact with the Postgres database.
     */
    public get db(): KyselyClient<KyselySchema> {
        return this.kysely.connection;
    }
}

export type KyselyServiceConstructor = TypedConstructor<typeof KyselyService<KyselyTable>>;
