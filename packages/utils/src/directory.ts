import { readdir } from 'node:fs/promises';
import * as path from 'node:path';

import type { Logger } from '@seedcord/services';
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
 */
export async function traverseDirectory(
  dir: string,
  callback: (fullPath: string, relativePath: string, imported: Record<string, unknown>) => Promise<void> | void,
  logger: Logger
): Promise<void> {
  let entries: fs.Dirent[];

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    logger.error('Failed to read this directory');
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
