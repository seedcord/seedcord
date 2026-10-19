import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError, vitePluginThrew, withoutQuery } from '@seedcord/utils/internal';

import { isListedFileId } from './builtFiles';

import type { BotLayout } from '@seedcord/utils/internal';
import type { Rolldown } from 'vite';

export const ENTRY_FILE_NAME = 'index.mjs';

export interface BundleStats {
    modules: number;
    listedFiles: number;
    bytes: number;
    entry: string;
}

export function bundleStats(chunks: Rolldown.OutputChunk[], layout: BotLayout, entry: string): BundleStats {
    const ids = chunks.flatMap((chunk) => chunk.moduleIds);

    return {
        modules: ids.filter((id) => layout.holds(withoutQuery(id))).length,
        listedFiles: ids.filter(isListedFileId).length,
        bytes: chunks.reduce((total, chunk) => total + Buffer.byteLength(chunk.code), 0),
        entry
    };
}

// a plugin hook can throw a seedcord error that already says what to fix
export function bundleFailed(error: unknown): never {
    if (isSeedcordError(error)) throw error;
    throw (
        vitePluginThrew(error) ??
        new SeedcordError(SeedcordErrorCode.CliBundleFailed, [asError(error).message], { cause: error })
    );
}
