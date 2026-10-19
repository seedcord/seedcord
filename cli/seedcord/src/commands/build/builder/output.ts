import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';
import { vitePluginThrew } from '@seedcord/utils/node/internal';

import { isListedFileId } from './builtFiles';

import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { Rolldown } from 'vite';

export const ENTRY_FILE_NAME = 'index.mjs';

export interface BundleStats {
    modules: number;
    listedFiles: number;
    bytes: number;
    entry: string;
}

export function bundleStats(chunks: Rolldown.OutputChunk[], files: ProjectFiles, entry: string): BundleStats {
    const ids = chunks.flatMap((chunk) => chunk.moduleIds);

    return {
        modules: ids.filter((id) => files.holds(id.split('?')[0] ?? '')).length,
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
