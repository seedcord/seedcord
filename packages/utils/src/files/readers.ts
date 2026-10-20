import { SeedcordErrorCode } from '@seedcord/errors';
import { displayPath, SeedcordError } from '@seedcord/errors/internal';

import { importFailed } from '#src/files/importFailed';
import { asError } from '#src/misc/asError';

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
 * It skips type declarations, dotfiles, dot-folders and node_modules. A `break` stops the walk before the next import.
 * A relative `dir` resolves against `root` from seedcord.config.ts, whichever file calls this.
 *
 * @throws A **SeedcordError** when the directory cannot be read.
 * @throws A **SeedcordError** when a file throws while it imports.
 * @throws A **SeedcordError** when `dir` is relative and the bot did not start through `seedcord dev` or its built output.
 * @throws A **SeedcordError** when the directory is outside `root` or has a dot-folder or node_modules in its path, under `seedcord dev` or in a built bot.
 * @throws A **SeedcordError** when the directory was missing at build time, in a built bot.
 *
 * @example
 * ```ts
 * for await (const { relativePath, imported } of importFiles('./commands')) {
 *     for (const exported of Object.values(imported)) register(exported, relativePath);
 * }
 * ```
 */
export async function* importFiles(dir: string): AsyncGenerator<ImportedFile> {
    for (const [fullPath, load] of await fileSource().modules(dir)) {
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
 * It skips the code files {@link importFiles} imports, .map files, dotfiles, dot-folders and node_modules.
 * In a built bot the files come from the build output. A relative `dir` resolves against `root`, the same as {@link importFiles}.
 * Under `seedcord dev` and in a built bot, `dir` has to be one of the folders that `files` in seedcord.config.ts lists, or a subfolder of one.
 *
 * @throws A **SeedcordError** when the directory or a file in it cannot be read.
 * @throws A **SeedcordError** when `dir` is relative and the bot did not start through `seedcord dev` or its built output.
 * @throws A **SeedcordError** when `dir` is outside every folder in `files` or has a dot-folder or node_modules in its path, under `seedcord dev` or in a built bot.
 * @throws A **SeedcordError** when the directory was missing at build time, in a built bot.
 *
 * @example
 * ```ts
 * for await (const { fullPath, bytes } of readFiles('./locales')) {
 *     locales.set(path.basename(fullPath, '.json'), JSON.parse(bytes.toString()));
 * }
 * ```
 */
export async function* readFiles(dir: string): AsyncGenerator<ReadFile> {
    for (const [fullPath, load] of await fileSource().files(dir)) {
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
