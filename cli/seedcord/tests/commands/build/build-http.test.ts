import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentLogger } from '#tests/silentLogger';

import { hasBun } from './hasBun';
import { smoke } from './smoke';

// a process holds one Seedcord. vitest gives each test file its own process.
const HTTP_BOT = join(import.meta.dirname, '../../fixtures/http-bot');

describe('seedcord build on an http bot', () => {
    it('loads its handlers and text files and answers an unsigned request', async () => {
        await BuildRunner.create(silentLogger).run(HTTP_BOT);

        const output = await smoke('http', process.execPath, [join(HTTP_BOT, 'dist/index.mjs')]);

        expect(output).toContain('fixture:text hello from the text table');
        expect(output).toContain('fixture:text hello from the markdown twin');
    }, 120_000);

    it('points import.meta.filename at the built file when a text file shares its name', async () => {
        await BuildRunner.create(silentLogger).run(HTTP_BOT);

        const output = await smoke('http', process.execPath, [join(HTTP_BOT, 'dist/index.mjs')]);
        const filename = /fixture:filename (\S+)/.exec(output)?.[1] ?? '';

        expect(readFileSync(filename, 'utf8')).toContain('fixture:filename');
    }, 120_000);

    it('resolves tsconfig path aliases in bot.ts and in handlers', async () => {
        await BuildRunner.create(silentLogger).run(HTTP_BOT);

        const output = await smoke('http', process.execPath, [join(HTTP_BOT, 'dist/index.mjs')]);

        expect(output).toContain('fixture:bot-alias-loaded');
        expect(output).toContain('fixture:handlers-loaded');
    }, 120_000);

    it('loads a .js handler the way dev does', async () => {
        await BuildRunner.create(silentLogger).run(HTTP_BOT);

        const output = await smoke('http', process.execPath, [join(HTTP_BOT, 'dist/index.mjs')]);

        expect(output).toContain('fixture:js-handler-loaded');
    }, 120_000);

    it('leaves import.meta inside strings and text files as written', async () => {
        await BuildRunner.create(silentLogger).run(HTTP_BOT);

        const output = await smoke('http', process.execPath, [join(HTTP_BOT, 'dist/index.mjs')]);

        expect(output).toContain('fixture:literal import.meta.dirname stays text');
        expect(output).toContain('fixture:text find files with import.meta.url');
    }, 120_000);

    it.skipIf(!hasBun())(
        'still loads its files as a bun binary moved away from dist',
        async () => {
            await BuildRunner.create(silentLogger).run(HTTP_BOT);
            const elsewhere = await mkdtemp(join(tmpdir(), 'seedcord-bun-'));
            const binary = join(elsewhere, 'bot');

            try {
                // bun leaves a .bun-build temp file in cwd when a compile dies
                execFileSync('bun', ['build', '--compile', join(HTTP_BOT, 'dist/index.mjs'), '--outfile', binary], {
                    cwd: elsewhere,
                    stdio: 'ignore'
                });
                const output = await smoke('http', binary);

                expect(output).toContain('fixture:text hello from the text table');
            } finally {
                await rm(elsewhere, { recursive: true, force: true });
            }
        },
        120_000
    );
});
