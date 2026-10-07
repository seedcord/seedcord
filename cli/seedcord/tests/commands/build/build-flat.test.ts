import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';

import { smoke } from './smoke';

const FLAT_BOT = join(import.meta.dirname, '../../fixtures/flat-bot');

describe('seedcord build on a bot whose root holds dist', () => {
    it('leaves the last build and the project files out of the next one', async () => {
        await BuildRunner.create(quietSteps).run(FLAT_BOT);
        await BuildRunner.create(quietSteps).run(FLAT_BOT);

        expect(existsSync(join(FLAT_BOT, 'dist/dist'))).toBe(false);
        expect(existsSync(join(FLAT_BOT, 'dist/seedcord.config.js'))).toBe(false);
        expect(existsSync(join(FLAT_BOT, 'dist/tsconfig.json.js'))).toBe(false);
        await expect(smoke('http', process.execPath, [join(FLAT_BOT, 'dist/index.mjs')])).resolves.toContain(
            'fixture:handlers-loaded'
        );
    }, 120_000);
});
