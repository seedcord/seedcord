import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { formatFilePath } from '../../src/misc/formatFilePath';

describe('formatFilePath', () => {
    const cwd = process.cwd();

    it('relativizes a path inside the working directory', () => {
        expect(formatFilePath(join(cwd, 'src', 'Bot.ts'))).toBe('./src/Bot.ts');
    });

    it('applies onlyDir and a custom prefix', () => {
        expect(formatFilePath(join(cwd, 'src', 'Bot.ts'), { onlyDir: true })).toBe('./src');
        expect(formatFilePath(join(cwd, 'src', 'Bot.ts'), { prefix: '' })).toBe('src/Bot.ts');
    });

    it('returns a path outside the working directory unchanged', () => {
        expect(formatFilePath('/elsewhere/src/Bot.ts')).toBe('/elsewhere/src/Bot.ts');
    });
});
