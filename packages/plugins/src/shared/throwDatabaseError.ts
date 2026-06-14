import { Logger } from '@seedcord/services';
import { DatabaseError } from 'seedcord/internal';

const logger = new Logger('DatabaseError');

/**
 * Wraps an unknown error in a {@link DatabaseError}, then throws it. Used by `@WrapDatabaseError` to
 * normalize raw database failures. The tracking uuid is minted when the fault is rendered, not here.
 *
 * @param error - The original error or value
 * @param message - Fallback message used when `error` is not an `Error`
 * @throws A {@link DatabaseError} carrying the message
 *
 * @internal
 */
export function throwDatabaseError(error: unknown, message: string): never {
    logger.error('Throwing DatabaseError', error instanceof Error ? error.name : String(error));
    const errorMessage = error instanceof Error ? error.message : message;
    throw new DatabaseError(errorMessage);
}
