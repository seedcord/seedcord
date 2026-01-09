import { expectAssignable, expectError, expectType } from 'tsd';

import { SeedcordErrorCode, isSeedcordError } from '../../src/Errors';

import type { SeedcordErrorTypeString } from '../../src/Errors';
import { SeedcordError, SeedcordTypeError } from '../../src/Errors/SeedcordError';

const singletonError = new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
expectType<'SeedcordError'>(singletonError.type);

const singletonWithOptions = new SeedcordError(SeedcordErrorCode.CoreSingletonViolation, {
    cause: new Error('root')
});
expectType<'SeedcordError'>(singletonWithOptions.type);

expectError(new SeedcordError(SeedcordErrorCode.LifecycleUnknownPhase));

expectError(new SeedcordError(SeedcordErrorCode.LifecycleUnknownPhase, undefined));

expectType<SeedcordError<SeedcordErrorCode.LifecycleUnknownPhase>>(
    new SeedcordError(SeedcordErrorCode.LifecycleUnknownPhase, ['boot'])
);

// eslint-disable-next-line no-magic-numbers
expectError(new SeedcordTypeError(SeedcordErrorCode.DecoratorCommandAlreadyRegistered, [1, 0n, '3']));

expectType<SeedcordTypeError<SeedcordErrorCode.DecoratorCommandAlreadyRegistered>>(
    new SeedcordTypeError(SeedcordErrorCode.DecoratorCommandAlreadyRegistered, ['Ping', 'global', 'guild'])
);

expectAssignable<SeedcordErrorTypeString>('SeedcordRangeError');

const maybeError: unknown = new SeedcordTypeError(SeedcordErrorCode.DecoratorInvalidMiddlewarePriority);
if (isSeedcordError(maybeError, 'SeedcordTypeError', SeedcordErrorCode.DecoratorInvalidMiddlewarePriority)) {
    expectType<'SeedcordTypeError'>(maybeError.type);
    expectType<SeedcordErrorCode.DecoratorInvalidMiddlewarePriority>(maybeError.code);
}

function narrowByCode(error: unknown): void {
    if (isSeedcordError(error, undefined, SeedcordErrorCode.CorePluginKeyExists)) {
        expectType<SeedcordErrorTypeString>(error.type);
        expectType<SeedcordErrorCode.CorePluginKeyExists>(error.code);
    }
}

narrowByCode(new SeedcordError(SeedcordErrorCode.CorePluginKeyExists, ['logger']));
