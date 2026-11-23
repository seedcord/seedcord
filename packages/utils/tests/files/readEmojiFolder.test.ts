import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { readEmojiFolder } from '#src/files/readEmojiFolder';

async function folderWith(...files: string[]): ReturnType<typeof mkdtempDisposable> {
    const folder = await mkdtempDisposable(join(tmpdir(), 'seedcord-emojis-'));
    for (const file of files) {
        await mkdir(dirname(join(folder.path, file)), { recursive: true });
        await writeFile(join(folder.path, file), '');
    }
    return folder;
}

// one error per problem, whether the scan throws it alone or inside an aggregate
async function problemsIn(...files: string[]): Promise<unknown[]> {
    await using folder = await folderWith(...files);
    const error: unknown = await readEmojiFolder(folder.path).catch((thrown: unknown) => thrown);
    // justified: AggregateError types its errors as any[]
    return error instanceof AggregateError ? (error.errors as unknown[]) : [error];
}

// matches an error with this code whose message has every part, in this order
function problem(code: SeedcordErrorCode, ...messageParts: string[]): unknown {
    const inOrder = new RegExp(messageParts.map((part) => RegExp.escape(part)).join('.*'), 's');
    return expect.objectContaining({ code, message: expect.stringMatching(inOrder) as string });
}

describe('readEmojiFolder', () => {
    it.for([
        { file: 'confirmation_check.png', name: 'confirmation_check', key: 'ConfirmationCheck', mime: 'image/png' },
        { file: 'core.avif', name: 'core', key: 'Core', mime: 'image/avif' },
        { file: 'streak2x.gif', name: 'streak2x', key: 'Streak2X', mime: 'image/gif' },
        { file: 'HTTPServer.webp', name: 'HTTPServer', key: 'HttpServer', mime: 'image/webp' },
        { file: 'LOUD.PNG', name: 'LOUD', key: 'Loud', mime: 'image/png' },
        { file: '9lives.png', name: '9lives', key: '9Lives', mime: 'image/png' },
        { file: '_1up.png', name: '_1up', key: '1Up', mime: 'image/png' },
        { file: '__.png', name: '__', key: '__', mime: 'image/png' },
        { file: 'badges/gold_star.jpeg', name: 'gold_star', key: 'GoldStar', mime: 'image/jpeg' }
    ])('reads $file as the emoji $name under the key $key', async ({ file, ...emoji }) => {
        await using folder = await folderWith(file);

        expect(await readEmojiFolder(folder.path)).toEqual([{ ...emoji, file: join(folder.path, file) }]);
    });

    it('reads a missing folder as empty', async () => {
        await using folder = await folderWith();

        expect(await readEmojiFolder(join(folder.path, 'missing'))).toEqual([]);
    });

    it('skips dotfiles, dot-folders and node_modules', async () => {
        await using folder = await folderWith('.DS_Store', '.drafts/wip.png', 'node_modules/pkg/logo.png', 'core.png');

        expect(await readEmojiFolder(folder.path)).toEqual([
            { key: 'Core', name: 'core', file: join(folder.path, 'core.png'), mime: 'image/png' }
        ]);
    });

    it.for([
        { file: 'a.png', why: 'one character' },
        { file: `${'a'.repeat(33)}.png`, why: '33 characters' },
        { file: 'thumbs-up.png', why: 'a hyphen' },
        { file: 'thumbs up.png', why: 'a space' },
        { file: 'café.png', why: 'an accented letter' }
    ])('rejects $file because its name has $why', async ({ file }) => {
        expect(await problemsIn(file)).toEqual([problem(SeedcordErrorCode.ConfigEmojiFileUnusable, '2 to 32')]);
    });

    it('rejects a file that Discord does not take as an image', async () => {
        expect(await problemsIn('notes.txt')).toEqual([problem(SeedcordErrorCode.ConfigEmojiFileUnusable, 'PNG')]);
    });

    it.for([
        { shared: 'Discord name', files: ['wave.png', 'animated/wave.gif'], shown: ['wave.gif', 'wave.png', 'wave'] },
        { shared: 'key', files: ['foo_bar.png', 'FooBar.png'], shown: ['FooBar.png', 'foo_bar.png', 'FooBar'] }
    ])('rejects two files with one $shared and shows both', async ({ files, shown }) => {
        expect(await problemsIn(...files)).toEqual([problem(SeedcordErrorCode.CoreDuplicateName, ...shown)]);
    });

    it('reports every problem in one throw', async () => {
        await using folder = await folderWith('thumbs-up.png', 'a.png', 'notes.txt');

        await expect(readEmojiFolder(folder.path)).rejects.toMatchObject({
            code: SeedcordErrorCode.ConfigEmojiFolderInvalid,
            errors: { length: 3 }
        });
    });
});
