import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { quickBuildRunner } from './quickBuildRunner';
import { smoke } from './smoke';

const RELATIVE_PATH_BOT = join(import.meta.dirname, '../../fixtures/relative-path-bot');

describe('seedcord build on a bot with relative paths', () => {
    let output = '';

    beforeAll(async () => {
        await quickBuildRunner().run(RELATIVE_PATH_BOT);
        output = await smoke('http', process.execPath, [join(RELATIVE_PATH_BOT, 'dist/index.mjs')]);
    }, 120_000);

    it('loads the handler folder from root in the built bot', () => {
        expect(output).toContain('fixture:handlers-loaded');
    });

    it('keeps the Envapter.baseDir that bot.ts sets', () => {
        expect(output).toContain('fixture:env from its own baseDir');
    });
});
