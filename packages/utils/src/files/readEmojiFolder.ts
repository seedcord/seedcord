import { existsSync } from 'node:fs';
import { parse } from 'node:path';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { partition, pascalCase } from 'es-toolkit';

import { BotLayout } from './BotLayout';

export interface FolderEmoji {
    key: string;
    name: string;
}

interface NamedFile extends FolderEmoji {
    file: string;
}

export interface EmojiFile extends NamedFile {
    mime: string;
}

// keyed by extension since nothing opens the file. discord reads the real format from the bytes
const IMAGE_TYPES = new Map([
    ['.png', 'image/png'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.gif', 'image/gif'],
    ['.apng', 'image/apng'],
    ['.webp', 'image/webp'],
    ['.avif', 'image/avif']
]);
// discord answers 400 for a name outside this
const DISCORD_NAME = /^\w{2,32}$/;

export function emojiFileAt(file: string): NamedFile {
    const { name } = parse(file);
    // pascalCase returns '' for a name that is all underscores
    return { key: pascalCase(name) || name, name, file };
}

// a file only reports the first check it fails
function checked(found: NamedFile): EmojiFile | SeedcordTypeError {
    const unusable = (problem: 'format' | 'name'): SeedcordTypeError =>
        new SeedcordTypeError(SeedcordErrorCode.ConfigEmojiFileUnusable, [found.file, problem]);

    const mime = IMAGE_TYPES.get(parse(found.file).ext.toLowerCase());
    if (mime === undefined) return unusable('format');
    return DISCORD_NAME.test(found.name) ? { ...found, mime } : unusable('name');
}

// one error per value that more than one item shares
function clashesIn<Item>(
    kind: string,
    sharedBy: ReadonlyMap<string, readonly Item[]>,
    labelOf: (item: Item) => string,
    note?: string
): SeedcordTypeError[] {
    return [...sharedBy]
        .filter(([, sharing]) => sharing.length > 1)
        .map(
            ([value, sharing]) =>
                new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, [kind, value, sharing.map(labelOf), note])
        );
}

const pathOf = ({ file }: EmojiFile): string => paint.path(file);

async function filesIn(folder: string): Promise<NamedFile[]> {
    if (!existsSync(folder)) return [];
    const entries = await Array.fromAsync(BotLayout.openAt(folder).entriesUnder(folder));
    return entries
        .flatMap(({ path: file, isFolder }) => (isFolder ? [] : [file]))
        .toSorted()
        .map(emojiFileAt);
}

interface ClashCheck<Item> {
    // the value two items can't share before their keys are compared, like the emoji name
    by: (item: Item) => string;
    kind: string;
    note?: string;
    labelOf: (item: Item) => string;
}

// items that share the first value only get that error. one clash shows up once
export function emojiClashes<Item extends Pick<FolderEmoji, 'key'>>(
    items: readonly Item[],
    { by, kind, note, labelOf }: ClashCheck<Item>
): SeedcordTypeError[] {
    const grouped = Map.groupBy(items, by);
    const onePerGroup = [...grouped.values()].flatMap((sharing) => sharing.slice(0, 1));
    return [
        ...clashesIn(kind, grouped, labelOf, note),
        ...clashesIn(
            `${paint.bold('Emojis')} key`,
            Map.groupBy(onePerGroup, ({ key }) => key),
            labelOf
        )
    ];
}

function usableEmojiFiles(found: readonly NamedFile[]): EmojiFile[] {
    const [unusable, usable] = partition(found.map(checked), (result) => result instanceof SeedcordTypeError);
    throwSingleOrAggregate(
        [...unusable, ...emojiClashes(usable, { by: ({ name }) => name, kind: 'emoji', labelOf: pathOf })],
        SeedcordErrorCode.ConfigEmojiFolderInvalid
    );
    return usable;
}

// a built bot gets this list because the file paths don't exist there
export async function folderEmojisIn(folder: string): Promise<FolderEmoji[]> {
    const files = await readEmojiFolder(folder);
    return files.map(({ key, name }) => ({ key, name }));
}

// sorted by path and includes subfolders. returns [] if the folder doesn't exist
export async function readEmojiFolder(folder: string): Promise<EmojiFile[]> {
    return usableEmojiFiles(await filesIn(folder));
}
