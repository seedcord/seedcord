import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vite-plus/test';

import { compilesBunBinaries, smokeBunBinary } from './bun';
import { quickBuildRunner } from './quickBuildRunner';
import { smoke } from './smoke';

const GATEWAY_BOT = join(import.meta.dirname, '../../fixtures/gateway-bot');

describe('seedcord build on a gateway bot', () => {
    beforeAll(async () => {
        await quickBuildRunner().run(GATEWAY_BOT);
    }, 120_000);

    it('loads its handlers', async () => {
        const output = await smoke('gateway', process.execPath, [join(GATEWAY_BOT, 'dist/index.mjs')]);

        expect(output).toContain('fixture:handlers-loaded');
    }, 120_000);

    it.skipIf(!compilesBunBinaries())(
        'loads its handlers as a bun binary moved away from dist',
        async () => {
            const output = await smokeBunBinary('gateway', GATEWAY_BOT);

            expect(output).toContain('fixture:handlers-loaded');
        },
        120_000
    );
});
