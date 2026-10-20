import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { CommandScanner } from '#core/modules/CommandScanner';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';

import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { RealPath } from '#core/project/realPath';

function filesAt(root: RealPath): ProjectFiles {
    return new ProjectFiles({
        root,
        configFile: realPath(join(root, 'seedcord.config.ts')),
        files: [],
        target: { kind: 'server', start: undefined, outDir: realPath(join(root, 'dist')) }
    });
}

function recordingLoader(imported: string[]): ModuleLoader {
    return {
        importModule: <TModule>(entryPath: string) => {
            imported.push(entryPath);
            // justified: an empty module has no values for the scanner to read
            return Promise.resolve({} as TModule);
        }
    };
}

describe('CommandScanner', () => {
    it('skips dot-folders and node_modules in the commands folder, the same as the bot', async () => {
        await using commands = await mkdtempDisposable(join(tmpdir(), 'scan-'));
        const root = realPath(commands.path);
        await writeFile(join(root, 'ban.ts'), 'export {};\n');
        for (const folder of ['.drafts', 'node_modules/pkg']) {
            await mkdir(join(root, folder), { recursive: true });
            await writeFile(join(root, folder, 'kick.ts'), 'export {};\n');
        }
        const imported: string[] = [];

        await new CommandScanner(recordingLoader(imported), filesAt(root)).scan('.');

        expect(imported).toEqual([join(root, 'ban.ts')]);
    });

    it('throws CorePathOutsideRoot for a commands folder outside root, the same as the bot', async () => {
        await using root = await mkdtempDisposable(join(tmpdir(), 'scan-root-'));
        await using elsewhere = await mkdtempDisposable(join(tmpdir(), 'scan-elsewhere-'));

        const scan = new CommandScanner(recordingLoader([]), filesAt(realPath(root.path))).scan(elsewhere.path);

        await expect(scan).rejects.toMatchObject({ code: SeedcordErrorCode.CorePathOutsideRoot });
    });
});
