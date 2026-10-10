import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { Rolldown } from 'vite';

export const ENTRY_FILE_NAME = 'index.mjs';

export interface BundleStats {
    modules: number;
    textFiles: number;
    bytes: number;
    entry: string;
}

export function bundleStats(chunks: Rolldown.OutputChunk[], files: ProjectFiles, entry: string): BundleStats {
    const projectIds = chunks.flatMap((chunk) => chunk.moduleIds).filter((id) => files.holds(id.split('?')[0] ?? ''));
    const textFiles = projectIds.filter((id) => id.includes('?raw')).length;

    return {
        modules: projectIds.length - textFiles,
        textFiles,
        bytes: chunks.reduce((total, chunk) => total + Buffer.byteLength(chunk.code), 0),
        entry
    };
}

export function bundleFailed(error: unknown): never {
    throw new SeedcordError(SeedcordErrorCode.CliBundleFailed, [asError(error).message], { cause: error });
}
