import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CommandScanner } from '#core/modules/CommandScanner';

import type { ModuleLoader } from '#core/modules/ModuleLoader';

describe('CommandScanner', () => {
    it('skips dot-folders and node_modules in the commands folder, the same as the bot', async () => {
        await using commands = await mkdtempDisposable(join(tmpdir(), 'scan-'));
        await writeFile(join(commands.path, 'ban.ts'), 'export {};\n');
        for (const folder of ['.drafts', 'node_modules/pkg']) {
            await mkdir(join(commands.path, folder), { recursive: true });
            await writeFile(join(commands.path, folder, 'kick.ts'), 'export {};\n');
        }
        const imported: string[] = [];
        const modules: ModuleLoader = {
            importModule: <TModule>(entryPath: string) => {
                imported.push(entryPath);
                // justified: an empty module has no values for the scanner to read
                return Promise.resolve({} as TModule);
            }
        };

        await new CommandScanner(modules, commands.path).scan('.');

        expect(imported).toEqual([join(commands.path, 'ban.ts')]);
    });
});
