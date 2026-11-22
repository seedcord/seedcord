import { mkdirSync, mkdtempDisposableSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { setDevFiles } from '@seedcord/utils/internal';
import { assert, describe, expect, it } from 'vite-plus/test';

import { expectedEmojis } from '#src/miscellaneous/expectedEmojis';

import type { EmojiConfig } from '@seedcord/types';

function projectWithEmojis(...files: string[]): Disposable {
    using setup = new DisposableStack();
    const project = setup.use(mkdtempDisposableSync(join(tmpdir(), 'seedcord-emojis-')));
    mkdirSync(join(project.path, 'emojis'));
    for (const file of files) writeFileSync(join(project.path, 'emojis', file), '');
    setup.use(setDevFiles({ root: project.path, listed: [], skippedFolders: [], emojiFolder: '/emojis' }));
    return setup.move();
}

describe('expectedEmojis', () => {
    it('lists the emojis folder, then the names and the guild pairs in bot.emojis', async () => {
        using _project = projectWithEmojis('dot.png');

        expect(await expectedEmojis({ Yes: 'dot', Wave: ['wave', 'g1'] })).toEqual([
            { kind: 'application', key: 'Dot', name: 'dot', inFolder: true },
            { kind: 'application', key: 'Yes', name: 'dot', inFolder: false },
            { kind: 'guild', key: 'Wave', name: 'wave', guildId: 'g1' }
        ]);
    });

    it('lists bot.emojis alone for a bot that the CLI did not start', async () => {
        expect(await expectedEmojis({ Confirm: 'confirm' })).toEqual([
            { kind: 'application', key: 'Confirm', name: 'confirm', inFolder: false }
        ]);
    });

    it('is empty without a folder and without bot.emojis', async () => {
        expect(await expectedEmojis(undefined)).toEqual([]);
    });

    it.for([
        { value: 42, shape: 'a number' },
        { value: ['wave'], shape: 'a pair without a guild id' },
        // a stray comma leaves a hole like this one
        { value: ['wave', ,], shape: 'a pair with an empty slot' }
    ])('rejects a bot.emojis value that is $shape', async ({ value }) => {
        // justified: the value is wrong on purpose
        const caught: unknown = await expectedEmojis({ Bad: value } as unknown as EmojiConfig).catch(
            (error: unknown) => error
        );

        expect(isSeedcordError(caught, 'SeedcordTypeError', SeedcordErrorCode.ConfigEmojiInvalid)).toBe(true);
    });

    it('rejects a key that the folder and bot.emojis both have', async () => {
        using _project = projectWithEmojis('dot.png');

        const caught: unknown = await expectedEmojis({ Dot: 'other_dot' }).catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordTypeError', SeedcordErrorCode.CoreDuplicateName));
        expect(caught.message).toMatch(/bot\.emojis.*Dot/s);
    });

    it('reports every bad entry in one throw', async () => {
        using _project = projectWithEmojis('dot.png');

        // justified: the number is wrong on purpose
        const configured = { Dot: 'other_dot', Bad: 42 } as unknown as EmojiConfig;
        const caught: unknown = await expectedEmojis(configured).catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordAggregateError', SeedcordErrorCode.ConfigEmojiUnresolved));
        expect(caught.errors).toHaveLength(2);
    });
});
