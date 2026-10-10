import { mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { serverCommands } from '#commands/build/builder/serverCommands';

let projectDir: string;

beforeEach(async () => {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-commands-'));
    projectDir = tmp.path;
    return () => tmp.remove();
});

async function commandsFor(packageJson?: Record<string, unknown>, outDir = 'dist'): Promise<Map<string, string>> {
    if (packageJson) await writeFile(join(projectDir, 'package.json'), JSON.stringify(packageJson));
    return new Map(serverCommands(join(projectDir, 'seedcord.config.ts'), join(projectDir, outDir, 'index.mjs')));
}

describe('serverCommands', () => {
    it('takes the binary name from package.json without its scope', async () => {
        const commands = await commandsFor({ name: '@acme/my-bot' });

        expect(commands.get('compile')).toMatch(/--outfile my-bot$/);
    });

    it('names the binary bot when package.json is missing', async () => {
        const commands = await commandsFor();

        expect(commands.get('compile')).toMatch(/--outfile bot$/);
    });

    it('names the binary bot when package.json has no name', async () => {
        const commands = await commandsFor({ private: true });

        expect(commands.get('compile')).toMatch(/--outfile bot$/);
    });

    it('quotes an entry path with a space so the commands paste into a shell', async () => {
        const commands = await commandsFor({ name: 'my-bot' }, 'build output');

        expect(commands.get('run')).toMatch(/^node '[^']* output\/index\.mjs'$/);
        expect(commands.get('compile')).toMatch(/--compile '[^']* output\/index\.mjs' --outfile my-bot$/);
    });

    it('keeps a $ and a quote literal in a posix shell', async () => {
        const commands = await commandsFor({ name: 'my-bot' }, "it's $cache");

        expect(commands.get('run')).toMatch(/it'\\''s \$cache\/index\.mjs'$/);
    });

    it('keeps a $ and a quote literal in powershell on windows', async () => {
        const platform = Object.getOwnPropertyDescriptor(process, 'platform');
        Object.defineProperty(process, 'platform', { value: 'win32' });
        try {
            const commands = await commandsFor({ name: 'my-bot' }, "it's $cache");

            expect(commands.get('run')).toMatch(/it''s \$cache\/index\.mjs'$/);
        } finally {
            if (platform) Object.defineProperty(process, 'platform', platform);
        }
    });
});
