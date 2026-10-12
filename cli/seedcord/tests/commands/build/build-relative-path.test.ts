import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';

import { smoke } from './smoke';

const RELATIVE_PATH_BOT = join(import.meta.dirname, '../../fixtures/relative-path-bot');

describe('seedcord build on a bot with a relative handler folder', () => {
    it('loads the folder from root in the built bot', async () => {
        await BuildRunner.create(quietSteps).run(RELATIVE_PATH_BOT);
        const output = await smoke('http', process.execPath, [join(RELATIVE_PATH_BOT, 'dist/index.mjs')]);

        expect(output).toContain('fixture:handlers-loaded');
    }, 120_000);
});
