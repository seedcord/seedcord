import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentLogger } from '#tests/silentLogger';

import { hasBun } from './hasBun';
import { smoke } from './smoke';

const GATEWAY_BOT = join(import.meta.dirname, '../../fixtures/gateway-bot');

describe('seedcord build on a gateway bot', () => {
    it('loads its handlers', async () => {
        await BuildRunner.create(silentLogger).run(GATEWAY_BOT);

        const output = await smoke('gateway', process.execPath, [join(GATEWAY_BOT, 'dist/index.mjs')]);

        expect(output).toContain('fixture:handlers-loaded');
    }, 120_000);

    it.skipIf(!hasBun())(
        'loads its handlers as a bun binary moved away from dist',
        async () => {
            await BuildRunner.create(silentLogger).run(GATEWAY_BOT);
            const elsewhere = await mkdtemp(join(tmpdir(), 'seedcord-bun-'));
            const binary = join(elsewhere, 'bot');

            try {
                // bun leaves a .bun-build temp file in cwd when a compile dies
                execFileSync('bun', ['build', '--compile', join(GATEWAY_BOT, 'dist/index.mjs'), '--outfile', binary], {
                    cwd: elsewhere,
                    stdio: 'ignore'
                });
                const output = await smoke('gateway', binary);

                expect(output).toContain('fixture:handlers-loaded');
            } finally {
                await rm(elsewhere, { recursive: true, force: true });
            }
        },
        120_000
    );
});
