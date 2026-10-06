import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { silentLogger } from '#tests/silentLogger';

import { smoke } from './smoke';

const HASH_BOT = join(import.meta.dirname, '../../fixtures/hash#bot');

describe('seedcord build on a bot whose path contains a #', () => {
    it('points import.meta.url at the same file as import.meta.filename', async () => {
        await BuildRunner.create(silentLogger).run(HASH_BOT);

        const output = await smoke('http', process.execPath, [join(HASH_BOT, 'dist/index.mjs')]);
        const filename = /fixture:filename (.+)\n/.exec(output)?.[1] ?? '';
        const url = /fixture:url (.+)\n/.exec(output)?.[1] ?? '';

        expect(filename).toContain('hash#bot');
        expect(fileURLToPath(url)).toBe(filename);
    }, 120_000);
});
