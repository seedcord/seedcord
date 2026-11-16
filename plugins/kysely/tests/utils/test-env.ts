import { core, it as base } from '@seedcord/plugin-utils/testing';

import { Kysely } from '#src/Kysely';

import { memorySqlite } from './dialects';

import type { KyselyOptions } from '#src/types/KyselyOptions';

type KyselyWith = (options?: Partial<KyselyOptions>) => Kysely;

export const it = base.extend<{ kyselyWith: KyselyWith }>({
    // disposes every plugin that the test built because the worker runs later test files in the same process
    kyselyWith: async ({ testEnv }, use) => {
        await testEnv.createFile('migrations/.keep', '');
        await using plugins = new AsyncDisposableStack();
        await use((options = {}) => {
            const plugin = new Kysely(core, {
                dialect: memorySqlite,
                migrations: { dir: testEnv.resolvePath('migrations') },
                dir: testEnv.resolvePath('services'),
                ...options
            });
            plugins.defer(() => plugin.dispose());
            return plugin;
        });
    }
});
