import { existsSync } from 'node:fs';
import { parse } from 'node:path';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { BotLayout } from '@seedcord/utils/internal';
import { pascalCase } from 'es-toolkit';

export interface EmojiFile {
    // what Emojis.<key> reads
    key: string;
    // the emoji's name on Discord
    name: string;
    file: string;
}

// the scan checks the extension because it never opens a file. discord reads the format from the bytes
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.apng', '.webp', '.avif']);
// discord answers 400 for a name outside this
const DISCORD_NAME = /^\w{2,32}$/;
const STARTS_WITH_LETTER = /^[A-Za-z]/;

// a file's error reports the first check that it fails
const FILE_CHECKS = [
    ['format', ({ file }: EmojiFile) => IMAGE_EXTENSIONS.has(parse(file).ext.toLowerCase())],
    ['name', ({ name }: EmojiFile) => DISCORD_NAME.test(name)],
    ['key', ({ key }: EmojiFile) => STARTS_WITH_LETTER.test(key)]
] as const;

function fileProblem(found: EmojiFile): SeedcordTypeError | undefined {
    const failed = FILE_CHECKS.find(([, passes]) => !passes(found));
    return failed && new SeedcordTypeError(SeedcordErrorCode.ConfigEmojiFileUnusable, [found.file, failed[0]]);
}

function clashes(kind: string, sharedBy: ReadonlyMap<string, readonly EmojiFile[]>): SeedcordTypeError[] {
    return [...sharedBy].flatMap(([value, sharing]) =>
        sharing.length > 1
            ? [
                  new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, [
                      kind,
                      value,
                      sharing.map(({ file }) => paint.path(file))
                  ])
              ]
            : []
    );
}

async function filesIn(folder: string): Promise<EmojiFile[]> {
    if (!existsSync(folder)) return [];
    const entries = await Array.fromAsync(BotLayout.openAt(folder).entriesUnder(folder));
    return entries
        .flatMap(({ path: file, isFolder }) => (isFolder ? [] : [file]))
        .toSorted()
        .map((file) => {
            const { name } = parse(file);
            return { key: pascalCase(name), name, file };
        });
}

// sorted by path, subfolders included. a missing folder reads as empty
export async function readEmojiFolder(folder: string): Promise<EmojiFile[]> {
    const found = await filesIn(folder);
    const checked = found.map((file) => ({ file, problem: fileProblem(file) }));
    const unusable = checked.flatMap(({ problem }) => problem ?? []);
    const usable = checked.flatMap(({ file, problem }) => (problem ? [] : file));
    const byName = Map.groupBy(usable, ({ name }) => name);
    // two files with one name also share a key. that pair gets one error, for the name
    const onePerName = [...byName.values()].flatMap((sharing) => sharing.slice(0, 1));
    const byKey = Map.groupBy(onePerName, ({ key }) => key);

    throwSingleOrAggregate(
        [...unusable, ...clashes('emoji', byName), ...clashes(`${paint.bold('Emojis')} key`, byKey)],
        SeedcordErrorCode.CliProblems
    );
    return usable;
}
