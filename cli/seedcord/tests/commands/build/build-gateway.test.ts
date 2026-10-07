import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentSteps } from '#tests/silentSteps';

import { hasBun, smokeBunBinary } from './bun';
import { smoke } from './smoke';

const GATEWAY_BOT = join(import.meta.dirname, '../../fixtures/gateway-bot');

describe('seedcord build on a gateway bot', () => {
    beforeAll(async () => {
        await BuildRunner.create(silentSteps).run(GATEWAY_BOT);
    }, 120_000);

    it('loads its handlers', async () => {
        const output = await smoke('gateway', process.execPath, [join(GATEWAY_BOT, 'dist/index.mjs')]);

        expect(output).toContain('fixture:handlers-loaded');
    }, 120_000);

    it.skipIf(!hasBun())(
        'loads its handlers as a bun binary moved away from dist',
        async () => {
            const output = await smokeBunBinary('gateway', GATEWAY_BOT);

            expect(output).toContain('fixture:handlers-loaded');
        },
        120_000
    );
});
