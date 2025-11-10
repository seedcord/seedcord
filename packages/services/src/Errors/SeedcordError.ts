import chalk from 'chalk';

import { SeedcordErrorCode } from './ErrorCodes';
import { formatSeedcordErrorMessage, type SeedcordErrorArguments } from './ErrorMessages';

export type SeedcordErrorIdentifier = keyof typeof SeedcordErrorCode;

export interface SeedcordErrorOptions extends ErrorOptions {}

function resolveIdentifier(code: SeedcordErrorCode): SeedcordErrorIdentifier {
    return SeedcordErrorCode[code] as SeedcordErrorIdentifier;
}

function resolveMessage(code: SeedcordErrorCode, args?: SeedcordErrorArguments<SeedcordErrorCode>): string {
    return formatSeedcordErrorMessage(code, args);
}

function formatErrorName(name: string, _identifier: SeedcordErrorIdentifier, code: SeedcordErrorCode): string {
    return `${chalk.bold.red(name)}[${chalk.gray(code)}]`;
}

export class SeedcordError extends Error {
    public readonly code: SeedcordErrorCode;
    public readonly identifier: SeedcordErrorIdentifier;

    constructor(
        code: SeedcordErrorCode,
        args?: SeedcordErrorArguments<SeedcordErrorCode>,
        options?: SeedcordErrorOptions
    ) {
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

export class SeedcordTypeError extends TypeError {
    public readonly code: SeedcordErrorCode;
    public readonly identifier: SeedcordErrorIdentifier;

    constructor(
        code: SeedcordErrorCode,
        args?: SeedcordErrorArguments<SeedcordErrorCode>,
        options?: SeedcordErrorOptions
    ) {
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

export class SeedcordRangeError extends RangeError {
    public readonly code: SeedcordErrorCode;
    public readonly identifier: SeedcordErrorIdentifier;

    constructor(
        code: SeedcordErrorCode,
        args?: SeedcordErrorArguments<SeedcordErrorCode>,
        options?: SeedcordErrorOptions
    ) {
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

export const SeedcordErrors = {
    Error: SeedcordError,
    TypeError: SeedcordTypeError,
    RangeError: SeedcordRangeError
} as const;

export type AnySeedcordError = SeedcordError | SeedcordTypeError | SeedcordRangeError;

export function isSeedcordError(error: unknown): error is AnySeedcordError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as { code: unknown }).code === 'number' &&
        'identifier' in error &&
        typeof (error as { identifier: unknown }).identifier === 'string'
    );
}
