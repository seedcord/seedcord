import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { compilesBunBinaries, smokeBunBinary } from './bun';
import { quickBuildRunner } from './quickBuildRunner';
import { smoke } from './smoke';

const GATEWAY_BOT = join(import.meta.dirname, '../../fixtures/gateway-bot');

describe('seedcord build on a gateway bot', () => {
    let output = '';

    beforeAll(async () => {
        await quickBuildRunner().run(GATEWAY_BOT);
        output = await smoke('gateway', process.execPath, [join(GATEWAY_BOT, 'dist/index.mjs')]);
    }, 120_000);

    it('loads its handlers', () => {
        expect(output).toContain('fixture:handlers-loaded');
    });

    it('reads the .env files beside seedcord.config.ts', () => {
        expect(output).toContain('fixture:env beside the config');
    });

    it.skipIf(!compilesBunBinaries())(
        'loads its handlers as a bun binary moved away from dist',
        async () => {
            const binaryOutput = await smokeBunBinary('gateway', GATEWAY_BOT);

            expect(binaryOutput).toContain('fixture:handlers-loaded');
        },
        120_000
    );
});
