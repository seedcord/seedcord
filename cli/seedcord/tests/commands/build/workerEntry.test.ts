import { runInNewContext } from 'node:vm';

import { BAKED_IDS_KEY } from '@seedcord/core/internal';
import { BotLayout } from '@seedcord/utils/internal';
import { describe, expect, it } from 'vitest';

import { workerEntry } from '#commands/build/builder/workerEntry';

import type { BakedIds } from '@seedcord/core/internal';

function bakedIdsRun(ids: BakedIds): BakedIds {
    const [plugin] = workerEntry({
        layout: BotLayout.openAt('/bot'),
        folders: [],
        instanceKey: '/bot.ts',
        functionExports: () => Promise.resolve([]),
        rootKey: '/',
        mode: { kind: 'build', ids }
    });
    // justified: the entry plugin's load hook is a plain function here
    const load = plugin.load as (id: string) => string;
    const slot = `globalThis[Symbol.for(${JSON.stringify(BAKED_IDS_KEY)})]`;
    // justified: the module assigns a BakedIds object to that slot
    return runInNewContext(`${load('\0virtual:seedcord/baked-ids')}\n${slot}`) as BakedIds;
}

describe('the baked ids module', () => {
    it('keeps a command named __proto__ as its own entry', () => {
        // JSON.parse makes __proto__ an own key
        const commands = JSON.parse(
            '{"__proto__":{"mention":"</__proto__:7>","id":"7","route":"__proto__","description":"edge"}}'
        ) as BakedIds['commands'];

        const baked = bakedIdsRun({
            publicKey: 'ab'.repeat(32),
            emojis: {},
            commands,
            contextMenus: { user: {}, message: {} }
        });

        expect(Object.hasOwn(baked.commands, '__proto__')).toBe(true);
    });
});
