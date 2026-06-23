import { readdir } from 'node:fs/promises';
import * as path from 'node:path';

import type { ILogger } from '@seedcord/types';
import type * as fs from 'node:fs';

/**
 * Determines if a directory entry is a TypeScript or JavaScript file.
 *
 * @param entry - The directory entry to check.
 * @returns True if the entry is a file ending with .ts or .js.
 */
export function isTsOrJsFile(entry: fs.Dirent): boolean {
    return (
        entry.isFile() &&
        (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) &&
        !entry.name.endsWith('.d.ts') &&
        !entry.name.endsWith('.map')
    );
}

/**
 * Recursively traverses through a directory, importing all .ts and .js files and applying a callback to each import.
 *
 * @param dir - The directory path to traverse.
 * @param callback - A function that will be called for each imported module. It receives the full file path, the file's relative path, and the imported module as arguments.
 * @returns A Promise that resolves when the traversal is complete.
 *
 * @example
 * ```ts
 * await traverseDirectory(
 *   './commands',
 *   (fullPath, relativePath, imported) => {
 *     for (const exported of Object.values(imported)) register(exported);
 *   },
 *   logger
 * );
 * ```
 */
export async function traverseDirectory(
    dir: string,
    callback: (fullPath: string, relativePath: string, imported: Record<string, unknown>) => Promise<void> | void,
    logger: ILogger
): Promise<void> {
    let entries: fs.Dirent[];

    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
        logger.error(`Failed to read directory ${dir}`, err);
        entries = [];
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(process.cwd(), fullPath);

        if (entry.isDirectory()) {
            await traverseDirectory(fullPath, callback, logger);
        } else if (isTsOrJsFile(entry)) {
            const imported = (await import(fullPath)) as Record<string, unknown>;
            await callback(fullPath, relativePath, imported);
        }
    }
}

/**
 * Options for formatting file paths.
 */
export interface FormatFileOptions {
    /**
     * Whether to return only the directory part of the path.
     *
     * @defaultValue `false`
     */
    onlyDir?: boolean;
    /**
     * A prefix to prepend to the formatted path.
     *
     * @defaultValue `'./'`
     */
    prefix?: string;
}

/**
 * Formats a file path relative to the current working directory.
 * @param filePath - The file path to format.
 * @param options - Formatting options.
 * @returns The formatted file path.
 *
 * @example
 * ```ts
 * // cwd is /repo
 * formatFilePath('/repo/src/Bot.ts'); // './src/Bot.ts'
 * formatFilePath('/repo/src/Bot.ts', { onlyDir: true }); // './src'
 * formatFilePath('/repo/src/Bot.ts', { prefix: '' }); // 'src/Bot.ts'
 * ```
 */
export function formatFilePath(filePath: string, options: FormatFileOptions = {}): string {
    const { onlyDir = false, prefix = './' } = options;

    const resolved = onlyDir
        ? path.relative(process.cwd(), filePath.replace(/\/[^/]*$/, ''))
        : path.relative(process.cwd(), filePath);
    return `${prefix}${resolved}`;
}
