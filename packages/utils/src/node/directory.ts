import { readdir } from 'node:fs/promises';
import * as path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type * as fs from 'node:fs';

/**
 * Determines if a directory entry is a TypeScript or JavaScript file.
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
 * @throws A **SeedcordError** when a directory cannot be read or a file throws while importing.
 *
 * @example
 * ```ts
 * await traverseDirectory('./commands', (fullPath, relativePath, imported) => {
 *     for (const exported of Object.values(imported)) register(exported);
 * });
 * ```
 */
export async function traverseDirectory(
    dir: string,
    callback: (fullPath: string, relativePath: string, imported: Record<string, unknown>) => Promise<void> | void
): Promise<void> {
    let entries: fs.Dirent[];

    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
        throw new SeedcordError(SeedcordErrorCode.CoreDirectoryUnreadable, [dir], { cause: err });
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(process.cwd(), fullPath);

        if (entry.isDirectory()) {
            await traverseDirectory(fullPath, callback);
        } else if (isTsOrJsFile(entry)) {
            let imported: Record<string, unknown>;
            try {
                imported = (await import(fullPath)) as Record<string, unknown>;
            } catch (err) {
                throw new SeedcordError(SeedcordErrorCode.CoreDirectoryImportFailed, [relativePath], { cause: err });
            }
            await callback(fullPath, relativePath, imported);
        }
    }
}
