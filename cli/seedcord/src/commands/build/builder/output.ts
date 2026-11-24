import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError, vitePluginThrew, withoutQuery } from '@seedcord/utils/internal';
import { sumBy } from 'es-toolkit';

import { isListedFileId } from './builtFiles';

import type { BotLayout } from '@seedcord/utils/internal';
import type { Rolldown } from 'vite';

export const ENTRY_FILE_NAME = 'index.mjs';

// rolldown warns once for each file that starts with 'use client', and a react library has dozens.
// the directive doesn't mean anything in a bot bundle because it doesn't have a client
export const BOT_CHECKS = { moduleLevelDirective: false } satisfies Rolldown.ChecksOptions;

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
        bytes: sumBy(chunks, (chunk) => Buffer.byteLength(chunk.code)),
        entry
    };
}

// a seedcord error from a plugin hook already has the fix in its message, and wrapping it would bury that
export function bundleFailed(error: unknown): never {
    if (isSeedcordError(error)) throw error;
    throw (
        vitePluginThrew(error) ??
        new SeedcordError(SeedcordErrorCode.CliBundleFailed, [asError(error).message], { cause: error })
    );
}
