import { describe, expect, it, vi } from 'vitest';

// resetModules gives the second import its own class objects, like a second installed copy
async function loadTwoCopies(): Promise<[typeof import('#src/internal.index'), typeof import('#src/index')]> {
    const thrower = await import('#src/internal.index');
    vi.resetModules();
    const catcher = await import('#src/index');
    return [thrower, catcher];
}

describe('isSeedcordError across two copies of the package', () => {
    it('recognises an error thrown by another copy', async () => {
        const [thrower, catcher] = await loadTwoCopies();
        const { SeedcordErrorCode } = await import('#src/ErrorCodes');

        const error = new thrower.SeedcordError(SeedcordErrorCode.CoreSingletonViolation);

        expect(catcher.isSeedcordError(error)).toBe(true);
    });

    it('still narrows by code across copies', async () => {
        const [thrower, catcher] = await loadTwoCopies();
        const { SeedcordErrorCode } = await import('#src/ErrorCodes');

        const error = new thrower.SeedcordTypeError(SeedcordErrorCode.CorePluginAfterInit);

        expect(catcher.isSeedcordError(error, 'SeedcordTypeError')).toBe(true);
        expect(catcher.isSeedcordError(error, 'SeedcordError')).toBe(false);
        expect(catcher.isSeedcordError(error, undefined, SeedcordErrorCode.CorePluginAfterInit)).toBe(true);
        expect(catcher.isSeedcordError(error, undefined, SeedcordErrorCode.CoreSingletonViolation)).toBe(false);
    });

    it('rejects a plain error and a foreign object', async () => {
        const [, catcher] = await loadTwoCopies();

        expect(catcher.isSeedcordError(new Error('plain'))).toBe(false);
        expect(catcher.isSeedcordError({ code: 1201, type: 'SeedcordError' })).toBe(false);
    });
});
