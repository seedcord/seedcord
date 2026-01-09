/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import chalk from 'chalk';

import { SeedcordErrorCode } from './ErrorCodes';
import { formatSeedcordErrorMessage, type SeedcordErrorArguments } from './ErrorMessages';

/**
 * String literal type for Seedcord error identifiers.
 *
 * @internal
 */
export type SeedcordErrorIdentifier = keyof typeof SeedcordErrorCode;

/**
 * Options for Seedcord errors.
 *
 * @internal
 */
export interface SeedcordErrorOptions extends ErrorOptions {}

function resolveIdentifier(code: SeedcordErrorCode): SeedcordErrorIdentifier {
    return SeedcordErrorCode[code] as SeedcordErrorIdentifier;
}

type SeedcordErrorPayload<Code extends SeedcordErrorCode> = SeedcordErrorArguments<Code> | undefined;

type SeedcordErrorCtorRest<Code extends SeedcordErrorCode> =
    SeedcordErrorArguments<Code> extends []
        ? [options?: SeedcordErrorOptions]
        : [args: SeedcordErrorArguments<Code>, options?: SeedcordErrorOptions];

function resolveCtorInputs<Code extends SeedcordErrorCode>(
    rest: SeedcordErrorCtorRest<Code>
): { args: SeedcordErrorPayload<Code>; options?: SeedcordErrorOptions } {
    const [maybeArgsOrOptions, maybeOptions] = rest;
    if (Array.isArray(maybeArgsOrOptions)) {
        const result: { args: SeedcordErrorPayload<Code>; options?: SeedcordErrorOptions } = {
            args: maybeArgsOrOptions
        };

        if (maybeOptions !== undefined) {
            result.options = maybeOptions;
        }

        return result;
    }

    const result: { args: SeedcordErrorPayload<Code>; options?: SeedcordErrorOptions } = {
        args: undefined
    };

    if (maybeArgsOrOptions !== undefined) {
        result.options = maybeArgsOrOptions;
    }

    return result;
}

function resolveMessage<Code extends SeedcordErrorCode>(code: Code, args: SeedcordErrorPayload<Code>): string {
    return formatSeedcordErrorMessage(code, args);
}

function formatErrorName(name: string, _identifier: SeedcordErrorIdentifier, code: SeedcordErrorCode): string {
    return `${chalk.bold.red(name)}[${chalk.gray(code)}]`;
}

/**
 * String literal type for Seedcord error class names.
 *
 * @internal
 */
export type SeedcordErrorTypeString = `Seedcord${'Error' | 'TypeError' | 'RangeError'}`;

/**
 * Base interface for Seedcord error instances.
 *
 * @internal
 */
export interface BaseSeedcordError {
    readonly code: SeedcordErrorCode;
    readonly identifier: SeedcordErrorIdentifier;
    readonly type: SeedcordErrorTypeString;
}

/**
 * Base class for Seedcord errors.
 *
 * @internal
 */
export class SeedcordError<Code extends SeedcordErrorCode = SeedcordErrorCode>
    extends Error
    implements BaseSeedcordError
{
    public readonly code: Code;
    public readonly identifier: SeedcordErrorIdentifier;
    public readonly type = 'SeedcordError';

    constructor(code: Code, ...rest: SeedcordErrorCtorRest<Code>) {
        const { args, options } = resolveCtorInputs(rest);
        const message = resolveMessage(code, args);
        super(message, options);
        this.code = code;
        this.identifier = resolveIdentifier(code);
        this.name = formatErrorName(new.target.name, this.identifier, this.code);
        Object.setPrototypeOf(this, new.target.prototype);
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, new.target);
        }
    }
}

/**
 * TypeError class for Seedcord errors.
 *
 * @internal
 */
export class SeedcordTypeError<Code extends SeedcordErrorCode = SeedcordErrorCode>
    extends TypeError
    implements BaseSeedcordError
{
    public readonly code: Code;
    public readonly identifier: SeedcordErrorIdentifier;
    public readonly type = 'SeedcordTypeError';

    constructor(code: Code, ...rest: SeedcordErrorCtorRest<Code>) {
        const { args, options } = resolveCtorInputs(rest);
        const message = resolveMessage(code, args);
        super(message, options);
        this.code = code;
        this.identifier = resolveIdentifier(code);
        this.name = formatErrorName(new.target.name, this.identifier, this.code);
        Object.setPrototypeOf(this, new.target.prototype);
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, new.target);
        }
    }
}

/**
 * RangeError class for Seedcord errors.
 *
 * @internal
 */
export class SeedcordRangeError<Code extends SeedcordErrorCode = SeedcordErrorCode>
    extends RangeError
    implements BaseSeedcordError
{
    public readonly code: Code;
    public readonly identifier: SeedcordErrorIdentifier;
    public readonly type = 'SeedcordRangeError';

    constructor(code: Code, ...rest: SeedcordErrorCtorRest<Code>) {
        const { args, options } = resolveCtorInputs(rest);
        const message = resolveMessage(code, args);
        super(message, options);
        this.code = code;
        this.identifier = resolveIdentifier(code);
        this.name = formatErrorName(new.target.name, this.identifier, this.code);
        Object.setPrototypeOf(this, new.target.prototype);
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, new.target);
        }
    }
}

/**
 * Variant type for Seedcord error classes.
 *
 * @internal
 */
export type SeedcordErrorVariant<
    Type extends SeedcordErrorTypeString,
    Code extends SeedcordErrorCode
> = Type extends 'SeedcordError'
    ? SeedcordError<Code>
    : Type extends 'SeedcordTypeError'
      ? SeedcordTypeError<Code>
      : SeedcordRangeError<Code>;

/**
 * Union type of all Seedcord error variants for a specific error code.
 *
 * @internal
 */
export type AnySeedcordErrorForCode<Code extends SeedcordErrorCode> = {
    [Variant in SeedcordErrorTypeString]: SeedcordErrorVariant<Variant, Code>;
}[SeedcordErrorTypeString];

/**
 * Union type of all Seedcord errors filtered by error class.
 *
 * @internal
 */
export type ErrorTypeFilter<Type extends SeedcordErrorTypeString | undefined> = Type extends SeedcordErrorTypeString
    ? {
          [Code in SeedcordErrorCode]: SeedcordErrorVariant<Type, Code>;
      }[SeedcordErrorCode]
    : AnySeedcordErrorForCode<SeedcordErrorCode>;

/**
 * Union type of all Seedcord errors filtered by error class and error code.
 *
 * @internal
 */
export type ErrorCodeFilter<
    Type extends SeedcordErrorTypeString | undefined,
    Code extends SeedcordErrorCode | undefined
> = Code extends SeedcordErrorCode
    ? Type extends SeedcordErrorTypeString
        ? SeedcordErrorVariant<Type, Code>
        : AnySeedcordErrorForCode<Code>
    : ErrorTypeFilter<Type>;

/**
 * Determines whether an unknown value is a Seedcord error, with optional narrowing by class and error code.
 *
 * @param error - The value to inspect.
 * @param type - Optional error class discriminator (Error, TypeError, or RangeError).
 * @param code - Optional {@link SeedcordErrorCode} discriminator to narrow by code.
 * @typeParam Type - What kind of {@link SeedcordErrorTypeString} to filter by.
 * @typeParam Code - The specific {@link SeedcordErrorCode} to filter by.
 */
export function isSeedcordError<
    Type extends SeedcordErrorTypeString | undefined,
    Code extends SeedcordErrorCode | undefined
>(error: unknown, type?: Type, code?: Code): error is ErrorCodeFilter<Type, Code> {
    const isSeedcordErrorInstance = error instanceof SeedcordError && error.type === 'SeedcordError';
    const isSeedcordTypeErrorInstance = error instanceof SeedcordTypeError && error.type === 'SeedcordTypeError';
    const isSeedcordRangeErrorInstance = error instanceof SeedcordRangeError && error.type === 'SeedcordRangeError';

    if (!isSeedcordErrorInstance && !isSeedcordTypeErrorInstance && !isSeedcordRangeErrorInstance) {
        return false; // Not a Seedcord error of any type
    }

    const matchesType = type
        ? (type === 'SeedcordError' && isSeedcordErrorInstance) ||
          (type === 'SeedcordTypeError' && isSeedcordTypeErrorInstance) ||
          (type === 'SeedcordRangeError' && isSeedcordRangeErrorInstance)
        : true; // No type to match, so it's a Seedcord error of some type

    if (!matchesType) return false; // Early return if type does not match
    if (code === undefined) return true; // No code to match, so it's a Seedcord error of the correct type
    return error.code === code; // Check if the code matches
}
