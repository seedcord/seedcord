import { isCancel } from '@clack/prompts';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// clack signals a cancel with a symbol
export function requireAnswer<Value>(value: Value | symbol): Value {
    if (isCancel(value)) throw new SeedcordError(SeedcordErrorCode.CreateCancelled);
    return value;
}
