import { assertType, expectTypeOf } from 'vitest';

import { SeedcordErrorCode, isSeedcordError } from '#src/index';
import { SeedcordError, SeedcordTypeError } from '#src/internal.index';

import type { SeedcordErrorTypeString } from '#src/index';
import type { ErrorCodeFilter } from '#src/SeedcordError';

// the invalid cases would throw
function errorTypeContracts(): void {
    expectTypeOf(new SeedcordError(SeedcordErrorCode.CoreSingletonViolation)).toEqualTypeOf<
        SeedcordError<SeedcordErrorCode.CoreSingletonViolation>
    >();

    expectTypeOf(
        new SeedcordError(SeedcordErrorCode.CoreSingletonViolation, { cause: new Error('root') })
    ).toEqualTypeOf<SeedcordError<SeedcordErrorCode.CoreSingletonViolation>>();

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
        expectTypeOf(maybeError).toEqualTypeOf<
            SeedcordTypeError<SeedcordErrorCode.DecoratorInvalidMiddlewarePriority>
        >();
    }

    function narrowByCode(error: unknown): void {
        if (!isSeedcordError(error, undefined, SeedcordErrorCode.CorePluginKeyExists)) return;

        expectTypeOf(error).toEqualTypeOf<ErrorCodeFilter<undefined, SeedcordErrorCode.CorePluginKeyExists>>();
    }

    narrowByCode(new SeedcordError(SeedcordErrorCode.CorePluginKeyExists, ['logger']));
}
void errorTypeContracts;
