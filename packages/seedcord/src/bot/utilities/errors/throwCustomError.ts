import { Logger } from '@seedcord/services';

import { DatabaseError } from '@bot/defaults/errors/Database';

import type { CustomError } from '@interfaces/Components';

/**
 * Throws a custom error with a formatted message and optional UUID.
 *
 * Wraps an unknown error in a {@link CustomError} subclass. If the error class
 * is {@link DatabaseError}, a UUID is generated and passed to the constructor.
 *
 * @typeParam Ctor - A constructor for a {@link CustomError} subclass
 * @param error - The original error or value
 * @param message - Custom message to include
 * @param CustomError - Error class to instantiate and throw
 * @throws Instance of the provided {@link CustomError} subclass
 *
 * @example
 * ```typescript
 * try {
 *   // risky code
 * } catch (e) {
 *   throwCustomError(e, "Something went wrong", MyCustomError);
 * }
 * ```
 *
 * @internal
 */
export function throwCustomError<Ctor extends new (message: string, ...args: any[]) => CustomError>(
    error: unknown,
    message: string,
    CustomError: Ctor
): never {
    const uuid = crypto.randomUUID();
    Logger.Error('Throwing Custom Error', (error as Error).name);

    if (typeof CustomError === typeof DatabaseError) {
        const errorMessage = error instanceof Error ? error.message : message;
        throw new CustomError(errorMessage, uuid);
    } else {
        if (error instanceof Error) {
            throw new CustomError(`${message}: ${error.message ? error.message : error.toString()}`);
        } else {
            throw new CustomError(message);
        }
    }
}
