import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentLogger } from '#tests/silentLogger';

import { smoke } from './smoke';

// one bot per file, since a Seedcord constructs once per process
const FLAT_BOT = join(import.meta.dirname, '../../fixtures/flat-bot');

describe('seedcord build on a bot whose root holds dist', () => {
    it('leaves the last build out of the next one', async () => {
        await BuildRunner.create(silentLogger).run(FLAT_BOT);
        await BuildRunner.create(silentLogger).run(FLAT_BOT);

        expect(existsSync(join(FLAT_BOT, 'dist/dist'))).toBe(false);
        await expect(smoke('http', process.execPath, [join(FLAT_BOT, 'dist/index.mjs')])).resolves.toContain(
            'fixture:handlers-loaded'
        );
    }, 120_000);
});
