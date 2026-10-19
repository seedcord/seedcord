import { join } from 'node:path';

import { afterEach, describe, it, expect, vi } from 'vitest';

import { toPosixPath } from '#src/files/paths';
import { formatFilePath } from '#src/misc/formatFilePath';

describe('formatFilePath', () => {
    const cwd = process.cwd();

    it('relativizes a path inside the working directory', () => {
        expect(formatFilePath(join(cwd, 'src', 'Bot.ts'))).toBe('./src/Bot.ts');
    });

    it('applies onlyDir and a custom prefix', () => {
        expect(formatFilePath(join(cwd, 'src', 'Bot.ts'), { onlyDir: true })).toBe('./src');
        expect(formatFilePath(join(cwd, 'src', 'Bot.ts'), { prefix: '' })).toBe('src/Bot.ts');
    });

    it('returns a path outside the working directory in full', () => {
        expect(formatFilePath('/elsewhere/src/Bot.ts')).toBe('/elsewhere/src/Bot.ts');
    });

    it('returns a sibling path that shares the cwd prefix in full', () => {
        expect(formatFilePath(`${cwd}-extra/src/Bot.ts`)).toBe(toPosixPath(`${cwd}-extra/src/Bot.ts`));
    });

    it('formats the working directory itself to the bare prefix', () => {
        expect(formatFilePath(cwd)).toBe('./');
    });

    it('keeps an empty prefix for the working directory itself', () => {
        expect(formatFilePath(cwd, { prefix: '' })).toBe('');
        expect(formatFilePath(join(cwd, 'Bot.ts'), { onlyDir: true, prefix: '' })).toBe('');
    });

    it('strips a backslash-separated filename with onlyDir', () => {
        expect(formatFilePath(String.raw`C:\repo\src\Bot.ts`, { onlyDir: true })).toBe('C:/repo/src');
    });
});

describe('formatFilePath on Windows', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shows a path inside the working directory with forward slashes', () => {
        vi.spyOn(process, 'cwd').mockReturnValue(String.raw`C:\repo`);

        expect(formatFilePath(String.raw`C:\repo\src\Bot.ts`)).toBe('./src/Bot.ts');
    });
});
