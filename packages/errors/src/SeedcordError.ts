import { SeedcordErrorCode } from './ErrorCodes';
import { formatSeedcordErrorMessage, type SeedcordErrorArguments } from './ErrorMessages';
import { paint } from './palette';

/**
 * String literal type for Seedcord error identifiers.
 *
 * @internal
 */
type SeedcordErrorIdentifier = keyof typeof SeedcordErrorCode;

/**
 * Options for Seedcord errors.
 *
 * @internal
 */
interface SeedcordErrorOptions extends ErrorOptions {}

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
    return `${paint.coral.bold(name)}[${paint.mute(code)}]`;
}

/**
 * String literal type for Seedcord error class names. Names the `type` argument of
 * {@link isSeedcordError}.
 */
export type SeedcordErrorTypeString = `Seedcord${'Error' | 'TypeError' | 'RangeError'}`;

interface BaseSeedcordError {
    readonly code: SeedcordErrorCode;
    readonly identifier: SeedcordErrorIdentifier;
    readonly type: SeedcordErrorTypeString;
}

// instanceof fails across two installed copies of this package. Both copies resolve the same
// Symbol.for key.
const CODED = Symbol.for('seedcord.errors.coded');

function brand(prototype: object): void {
    Object.defineProperty(prototype, CODED, { value: true });
}

function isCoded(error: unknown): error is BaseSeedcordError {
    return typeof error === 'object' && error !== null && CODED in error;
}

/**
 * Base class for Seedcord errors.
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

brand(SeedcordError.prototype);

/**
 * TypeError class for Seedcord errors.
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

brand(SeedcordTypeError.prototype);

/**
 * RangeError class for Seedcord errors.
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

brand(SeedcordRangeError.prototype);

/**
 * Variant type for Seedcord error classes.
 *
 * @internal
 */
type SeedcordErrorVariant<
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
type AnySeedcordErrorForCode<Code extends SeedcordErrorCode> = {
    [Variant in SeedcordErrorTypeString]: SeedcordErrorVariant<Variant, Code>;
}[SeedcordErrorTypeString];

/**
 * Union type of all Seedcord errors filtered by error class.
 *
 * @internal
 */
type ErrorTypeFilter<Type extends SeedcordErrorTypeString | undefined> = Type extends SeedcordErrorTypeString
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
    if (!isCoded(error)) return false;
    if (type && error.type !== type) return false;
    if (code === undefined) return true;
    return error.code === code;
}
