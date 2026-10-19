import { describe, expect, it } from 'vitest';

import { SeedcordErrorCode, isSeedcordError } from '#src/index';
import { SeedcordError, SeedcordTypeError, SeedcordRangeError } from '#src/internal.index';

describe('Seedcord error constructors', () => {
    it('puts the code in the error name for parameterless codes', () => {
        const error = new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);

        expect(error).toBeInstanceOf(SeedcordError);
        expect(error.name).toContain(String(SeedcordErrorCode.CoreSingletonViolation));
    });

    it('accepts options without forcing placeholder args', () => {
        const cause = new Error('root');
        const error = new SeedcordError(SeedcordErrorCode.CorePluginAfterInit, { cause });

        expect(error.cause).toBe(cause);
    });

    it('formats messages with tuple arguments', () => {
        const phase = 'boot';

        expect(new SeedcordError(SeedcordErrorCode.LifecycleUnknownPhase, [phase]).message).toContain(phase);
    });

    it('supports SeedcordTypeError and SeedcordRangeError variants', () => {
        const typeError = new SeedcordTypeError(SeedcordErrorCode.DecoratorInvalidMiddlewarePriority, ['Audit', 'NaN']);
        const rangeError = new SeedcordRangeError(SeedcordErrorCode.PluginKyselyInvalidMigrationModule, ['foo.ts']);

        expect(typeError).toBeInstanceOf(TypeError);
        expect(rangeError).toBeInstanceOf(RangeError);
        expect(rangeError.message).toContain('foo.ts');
    });
});

describe('a reason that ends in a code frame', () => {
    const FRAME = 'YAMLException: bad indent\n\n 1 | reply: [broken\n-----^';

    it('starts the fix on its own line and leaves the frame as it was', () => {
        const error = new SeedcordError(SeedcordErrorCode.CoreVitePluginThrew, [
            'yaml',
            { hook: 'transform', loading: { kind: 'file', path: '/bot/src/ping.yaml' } },
            '/bot/seedcord.config.ts',
            FRAME
        ]);

        expect(error.message).toContain(`${FRAME}\nFix`);
    });

    it('ends a one-line reason with a period before the next sentence', () => {
        const error = new SeedcordError(SeedcordErrorCode.CorePathUnreadable, ['/bot/src', 'EACCES']);

        expect(error.message).toContain('EACCES. Check that it exists');
    });
});

describe('isSeedcordError type guard', () => {
    const baseError = new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
    const typeError = new SeedcordTypeError(SeedcordErrorCode.DecoratorInvalidMiddlewarePriority, ['Audit', 'NaN']);

    it('detects any Seedcord error without filters', () => {
        expect(isSeedcordError(baseError)).toBe(true);
        expect(isSeedcordError(typeError)).toBe(true);
        expect(isSeedcordError(new Error('nope'))).toBe(false);
    });

    it('optionally narrows by constructor type', () => {
        expect(isSeedcordError(baseError, 'SeedcordError')).toBe(true);
        expect(isSeedcordError(baseError, 'SeedcordTypeError')).toBe(false);
        expect(isSeedcordError(typeError, 'SeedcordTypeError')).toBe(true);
        expect(isSeedcordError(typeError, 'SeedcordRangeError')).toBe(false);
    });

    it('optionally narrows by error code', () => {
        expect(isSeedcordError(baseError, undefined, SeedcordErrorCode.CoreSingletonViolation)).toBe(true);
        expect(isSeedcordError(baseError, undefined, SeedcordErrorCode.CorePluginAfterInit)).toBe(false);
    });

    it('accepts combined constructor type and code filters', () => {
        expect(
            isSeedcordError(typeError, 'SeedcordTypeError', SeedcordErrorCode.DecoratorInvalidMiddlewarePriority)
        ).toBe(true);

        expect(isSeedcordError(typeError, 'SeedcordTypeError', SeedcordErrorCode.CoreSingletonViolation)).toBe(false);
    });
});
