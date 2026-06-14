import { assertType, describe, expect, expectTypeOf, it } from 'vitest';

import { SeedcordErrorCode, isSeedcordError } from '../src';
import { SeedcordError, SeedcordTypeError } from '../src/SeedcordError';

import type { SeedcordErrorTypeString } from '../src';

// never run, the invalid cases would throw, but tc checks the body anyway
function errorTypeContracts(): void {
    const singletonError = new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
    expectTypeOf(singletonError).toHaveProperty('type').toEqualTypeOf<'SeedcordError'>();

    const singletonWithOptions = new SeedcordError(SeedcordErrorCode.CoreSingletonViolation, {
        cause: new Error('root')
    });
    expectTypeOf(singletonWithOptions).toHaveProperty('type').toEqualTypeOf<'SeedcordError'>();

    // @ts-expect-error LifecycleUnknownPhase requires a [phase] tuple
    void new SeedcordError(SeedcordErrorCode.LifecycleUnknownPhase);

    // @ts-expect-error a code that takes args rejects an undefined payload
    void new SeedcordError(SeedcordErrorCode.LifecycleUnknownPhase, undefined);

    expectTypeOf(new SeedcordError(SeedcordErrorCode.LifecycleUnknownPhase, ['boot'])).toEqualTypeOf<
        SeedcordError<SeedcordErrorCode.LifecycleUnknownPhase>
    >();

    // @ts-expect-error tuple element types must match the code's argument signature
    void new SeedcordTypeError(SeedcordErrorCode.DecoratorCommandAlreadyRegistered, [1, 0n, '3']);

    expectTypeOf(
        new SeedcordTypeError(SeedcordErrorCode.DecoratorCommandAlreadyRegistered, ['Ping', 'global', 'guild'])
    ).toEqualTypeOf<SeedcordTypeError<SeedcordErrorCode.DecoratorCommandAlreadyRegistered>>();

    assertType<SeedcordErrorTypeString>('SeedcordRangeError');

    const maybeError: unknown = new SeedcordTypeError(SeedcordErrorCode.DecoratorInvalidMiddlewarePriority);
    if (isSeedcordError(maybeError, 'SeedcordTypeError', SeedcordErrorCode.DecoratorInvalidMiddlewarePriority)) {
        expectTypeOf(maybeError).toHaveProperty('type').toEqualTypeOf<'SeedcordTypeError'>();
        expectTypeOf(maybeError.code).toEqualTypeOf<SeedcordErrorCode.DecoratorInvalidMiddlewarePriority>();
    }

    function narrowByCode(error: unknown): void {
        if (isSeedcordError(error, undefined, SeedcordErrorCode.CorePluginKeyExists)) {
            expectTypeOf(error).toHaveProperty('type').toEqualTypeOf<SeedcordErrorTypeString>();
            expectTypeOf(error.code).toEqualTypeOf<SeedcordErrorCode.CorePluginKeyExists>();
        }
    }

    narrowByCode(new SeedcordError(SeedcordErrorCode.CorePluginKeyExists, ['logger']));
}

describe('Seedcord error types', () => {
    it('enforces the constructor and narrowing contracts at compile time', () => {
        expect(errorTypeContracts).toBeTypeOf('function');
    });
});
