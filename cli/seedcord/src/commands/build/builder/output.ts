import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError, vitePluginThrew, withoutQuery } from '@seedcord/utils/internal';
import { sumBy } from 'es-toolkit';

import { BOT_ENVIRONMENT } from '#core/modules/botEnvironment';

import { isListedFileId } from './builtFiles';

import type { BotLayout } from '@seedcord/utils/internal';
import type { Plugin, Rolldown } from 'vite';

export function captureChunks(onChunks: (chunks: Rolldown.OutputChunk[]) => void): Plugin {
    return {
        name: 'seedcord:capture-chunks',
        applyToEnvironment: (environment) => environment.name === BOT_ENVIRONMENT,
        generateBundle(_options, bundle) {
            onChunks(Object.values(bundle).filter((file) => file.type === 'chunk'));
        }
    };
}

export const ENTRY_FILE_NAME = 'index.mjs';

// rolldown warns once for each file that starts with 'use client', and a react library has dozens.
// the directive doesn't mean anything in a bot bundle because the bot runs on a server
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
