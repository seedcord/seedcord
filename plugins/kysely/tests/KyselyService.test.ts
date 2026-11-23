import { SeedcordErrorCode } from '@seedcord/errors';
import { core } from '@seedcord/plugin-utils/testing';
import { describe, it, expect } from 'vite-plus/test';

import { KyselyServiceMetadataKey } from '#src/decorators/RegisterKyselyService';
import { KyselyService } from '#src/KyselyService';

import type { Kysely } from '#src/Kysely';

// justified: both guards throw before the service reads it
const kysely = {} as Kysely;

class Undecorated extends KyselyService {}

class MissingTable extends KyselyService {}
// set the key directly to leave the table out because the decorator always writes a table with the key
Reflect.defineMetadata(KyselyServiceMetadataKey, 'users', MissingTable);

describe('KyselyService constructor guards', () => {
    it('throws when the class is missing its decorator', () => {
        expect(() => new Undecorated(kysely, core)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginServiceDecoratorMissing })
        );
    });

    it('throws when the key is registered without a table', () => {
        expect(() => new MissingTable(kysely, core)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginKyselyServiceTableMissing })
        );
    });
});
