import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

export const ENTRY_FILE_NAME = 'index.mjs';

export interface BundleStats {
    modules: number;
    textFiles: number;
    bytes: number;
    entry: string;
}

export function bundleFailed(error: unknown): never {
    const reason = Error.isError(error) ? error.message : String(error);
    throw new SeedcordError(SeedcordErrorCode.CliBundleFailed, [reason], { cause: error });
}
