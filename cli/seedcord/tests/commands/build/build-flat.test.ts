import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { quickBuildRunner } from './quickBuildRunner';
import { smoke } from './smoke';

import type { BuildResult } from '#commands/build/BuildRunner';

const FLAT_BOT = join(import.meta.dirname, '../../fixtures/flat-bot');

describe('seedcord build on a bot whose root holds dist, built twice with the second build run from inside root', () => {
    let second: BuildResult;

    beforeAll(async () => {
        await quickBuildRunner().run(FLAT_BOT);
        const cwd = process.cwd();
        process.chdir(FLAT_BOT);
        try {
            second = await quickBuildRunner().run(FLAT_BOT);
        } finally {
            process.chdir(cwd);
        }
    }, 120_000);

    it('leaves the last build and the project files out of the next one', () => {
        expect(existsSync(join(FLAT_BOT, 'dist/dist'))).toBe(false);
        expect(existsSync(join(FLAT_BOT, 'dist/seedcord.config.js'))).toBe(false);
        expect(existsSync(join(FLAT_BOT, 'dist/tsconfig.json.js'))).toBe(false);
    });

    it('builds a bot that starts', async () => {
        expect(second.bundle.modules).toBe(3);
        await expect(smoke('http', process.execPath, [join(FLAT_BOT, 'dist/index.mjs')])).resolves.toContain(
            'fixture:handlers-loaded'
        );
    }, 120_000);
});
