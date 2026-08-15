import { describe, expect, it } from 'vitest';

import { SeedcordErrorCode, isSeedcordError } from '#src/index';
import { SeedcordError, SeedcordTypeError, SeedcordRangeError } from '#src/internal.index';

describe('Seedcord error constructors', () => {
    it('preserves metadata for parameterless codes', () => {
        const error = new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);

        expect(error).toBeInstanceOf(SeedcordError);
        expect(error.code).toBe(SeedcordErrorCode.CoreSingletonViolation);
        expect(error.identifier).toBe('CoreSingletonViolation');
        expect(error.type).toBe('SeedcordError');
        expect(error.name).toContain(String(SeedcordErrorCode.CoreSingletonViolation));
    });

    it('accepts options without forcing placeholder args', () => {
        const cause = new Error('root');
        const error = new SeedcordError(SeedcordErrorCode.CorePluginAfterInit, { cause });

        expect(error.cause).toBe(cause);
        expect(error.message).toContain('Cannot attach a plugin');
    });

    it('formats messages with tuple arguments', () => {
        const phase = 'boot';
        const error = new SeedcordError(SeedcordErrorCode.LifecycleUnknownPhase, [phase]);

        expect(error.message).toContain(phase);
        expect(error.identifier).toBe('LifecycleUnknownPhase');
    });

    it('supports SeedcordTypeError and SeedcordRangeError variants', () => {
        const typeError = new SeedcordTypeError(SeedcordErrorCode.DecoratorInvalidMiddlewarePriority);
        const rangeError = new SeedcordRangeError(SeedcordErrorCode.PluginKyselyInvalidMigrationModule, ['foo.ts']);

        expect(typeError).toBeInstanceOf(TypeError);
        expect(typeError.type).toBe('SeedcordTypeError');
        expect(rangeError).toBeInstanceOf(RangeError);
        expect(rangeError.type).toBe('SeedcordRangeError');
        expect(rangeError.message).toContain('foo.ts');
    });
});

describe('isSeedcordError type guard', () => {
    const baseError = new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
    const typeError = new SeedcordTypeError(SeedcordErrorCode.DecoratorInvalidMiddlewarePriority);

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
