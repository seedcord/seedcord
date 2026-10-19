import { SeedcordErrorCode } from '@seedcord/errors';
import { displayPath, SeedcordError } from '@seedcord/errors/internal';

import { asError } from '#src/misc/asError';
import { importFailed } from '#src/node/importFailed';

import { assertListedFolder, resolveFolder } from './slots';
import { fileSource } from './sources';

import type { Buffer } from 'node:buffer';

interface FoundFile {
    fullPath: string;
    /**
     * The path to show in logs. A file under the working directory gets a relative path. Any other file gets its absolute path.
     */
    relativePath: string;
}

interface ImportedFile extends FoundFile {
    imported: Record<string, unknown>;
}

interface ReadFile extends FoundFile {
    bytes: Buffer;
}

/**
 * Imports every .ts, .tsx, .mts, .js, .jsx or .mjs file under a directory, recursively and sorted by path, yielding each module in turn.
 * It skips type declarations, dotfiles and dot-folders. A `break` stops the walk before the next import.
 * A relative `dir` resolves against `root` from seedcord.config.ts, whichever file calls this.
 *
 * @throws A **SeedcordError** when the directory cannot be read or a file throws while importing, when `dir` is relative and the bot did not start through `seedcord dev` or its built output, or in a built bot when the directory is outside `root` or was missing when it was built.
 *
 * @example
 * ```ts
 * for await (const { relativePath, imported } of traverseDirectory('./commands')) {
 *     for (const exported of Object.values(imported)) register(exported, relativePath);
 * }
 * ```
 */
export async function* traverseDirectory(dir: string): AsyncGenerator<ImportedFile> {
    for (const [fullPath, load] of await fileSource().modules(resolveFolder(dir))) {
        const relativePath = displayPath(fullPath);
        let imported: Record<string, unknown>;
        try {
            imported = await load();
        } catch (err) {
            throw importFailed(relativePath, err);
        }
        yield { fullPath, relativePath, imported };
    }
}

/**
 * Reads every file under a directory, recursively and sorted by path, yielding its bytes. Text and binary files both work.
 * It skips the code files {@link traverseDirectory} imports, .map files, dotfiles and dot-folders.
 * In a built bot the files come from the build output. A relative `dir` resolves against `root`, the same as {@link traverseDirectory}.
 * Under `seedcord dev` and in a built bot, `dir` has to be one of the folders `files` in seedcord.config.ts lists, or a subfolder of one.
 *
 * @throws A **SeedcordError** when the directory or a file in it cannot be read, when `dir` is relative and the bot did not start through `seedcord dev` or its built output, when `dir` is outside `root` or outside every folder in `files`, or in a built bot when the directory was missing when it was built.
 *
 * @example
 * ```ts
 * for await (const { fullPath, bytes } of readFiles('./locales')) {
 *     locales.set(path.basename(fullPath, '.json'), JSON.parse(bytes.toString()));
 * }
 * ```
 */
export async function* readFiles(dir: string): AsyncGenerator<ReadFile> {
    const folder = resolveFolder(dir);
    assertListedFolder(folder);
    for (const [fullPath, load] of await fileSource().files(folder)) {
        const relativePath = displayPath(fullPath);
        let bytes: Buffer;
        try {
            bytes = await load();
        } catch (err) {
            throw new SeedcordError(SeedcordErrorCode.CorePathUnreadable, [relativePath, asError(err).message], {
                cause: err
            });
        }
        yield { fullPath, relativePath, bytes };
    }
}
