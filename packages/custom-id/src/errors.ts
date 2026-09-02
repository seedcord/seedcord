import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

export function staleError(prefix: string): Error {
    return new SeedcordError(SeedcordErrorCode.CustomIdWireStale, [prefix]);
}

export function invalidError(detail: string): Error {
    return new SeedcordError(SeedcordErrorCode.CustomIdWireInvalid, [detail]);
}
