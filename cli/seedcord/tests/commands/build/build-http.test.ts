import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentLogger } from '#tests/silentLogger';

import { hasBun } from './hasBun';
import { smoke } from './smoke';

// one bot per file, since a Seedcord constructs once per process
const HTTP_BOT = join(import.meta.dirname, '../../fixtures/http-bot');

describe('seedcord build on an http bot', () => {
    it('loads its handlers and text files and answers an unsigned request', async () => {
        await BuildRunner.create(silentLogger).run(HTTP_BOT);

        const output = await smoke('http', process.execPath, [join(HTTP_BOT, 'dist/index.mjs')]);

        expect(output).toContain('fixture:text hello from the text table');
        // greeting.txt and greeting.md both build to a greeting js file
        expect(output).toContain('fixture:text hello from the markdown twin');
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
