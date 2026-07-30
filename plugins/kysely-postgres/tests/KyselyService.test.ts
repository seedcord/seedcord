import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, it, expect } from 'vitest';

import { KyselyServiceMetadataKey } from '@src/decorators/RegisterKyselyService';
import { KyselyService } from '@src/KyselyService';

import type { CoreBase } from '@seedcord/core';
import type { KyselyPostgres } from '@src/KyselyPostgres';

// justified: both guards throw before either argument is read
const kysely = {} as unknown as KyselyPostgres;
const core = {} as unknown as CoreBase;

class Undecorated extends KyselyService {}

class MissingTable extends KyselyService {}
// the decorator always writes a table with the key, so set the key directly to leave one out
Reflect.defineMetadata(KyselyServiceMetadataKey, 'users', MissingTable);

describe('KyselyService constructor guards', () => {
    it('throws when the class has no decorator', () => {
        expect(() => new Undecorated(kysely, core)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyServiceDecoratorMissing })
        );
    });

    it('throws when the key is registered with no table', () => {
        expect(() => new MissingTable(kysely, core)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyServiceTableMissing })
        );
    });
});
