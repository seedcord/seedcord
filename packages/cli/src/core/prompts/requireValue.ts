import { cancel, isCancel } from '@clack/prompts';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// clack signals cancel with a symbol, not a throw
export function requireValue<Value>(value: Value | symbol): Value {
    if (isCancel(value)) {
        cancel('Cancelled.');
        throw new SeedcordError(SeedcordErrorCode.CliCancelled);
    }
    return value;
}
