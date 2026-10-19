import { existsSync } from 'node:fs';
import * as path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { isInside, resolveFromRoot } from '#src/node/paths';

import type { EncodedFile } from './encodedFile';

export type ModuleLoader = () => Promise<Record<string, unknown>>;
export type EncodedFileLoader = () => Promise<EncodedFile>;

export interface BotFolders {
    root: string;
    // the folders from files in seedcord.config.ts, root-relative like '/locales'
    listed: string[];
}

export interface BuiltFileLoaders extends BotFolders {
    kind: 'built';
    // every folder under root, empty ones included
    folders: string[];
    modules: Record<string, ModuleLoader>;
    // the non-code files under the listed folders
    files: Record<string, EncodedFileLoader>;
    // seedcord dev runs the source files themselves
    sourcePaths?: boolean;
    // relative to root. only a server build writes it
    configFile?: string;
}

// server dev reads the files off disk
interface DiskFiles extends BotFolders {
    kind: 'disk';
}

type BotFiles = BuiltFileLoaders | DiskFiles;

// dev writes this from the CLI's copy of this module. the generated entry writes it without importing seedcord
export const BOT_FILES_KEY = 'seedcord:utils:bot-files';
// the generated entry calls the function here right after it writes the built files
export const BUILT_FILES_READY_KEY = 'seedcord:utils:built-files-ready';

function botFiles(): BotFiles | undefined {
    return Reflect.get(globalThis, Symbol.for(BOT_FILES_KEY)) as BotFiles | undefined;
}

export function builtFiles(): BuiltFileLoaders | undefined {
    const files = botFiles();
    return files?.kind === 'built' ? files : undefined;
}

// an app can import seedcord before the built bot it embeds
export function setBuiltFilesHook(callback: () => void): void {
    if (builtFiles()) callback();
    else Reflect.set(globalThis, Symbol.for(BUILT_FILES_READY_KEY), callback);
}

export function builtConfigDir(): string | undefined {
    const built = builtFiles();
    if (built?.configFile === undefined) return undefined;

    const configFile = path.resolve(built.root, built.configFile);
    // a bun binary's root is under /$bunfs
    return existsSync(configFile) ? path.dirname(configFile) : undefined;
}

export function setDevFiles(folders: BotFolders | undefined): void {
    const key = Symbol.for(BOT_FILES_KEY);
    if (folders === undefined) Reflect.deleteProperty(globalThis, key);
    else Reflect.set(globalThis, key, { kind: 'disk', ...folders } satisfies DiskFiles);
}

export function resolveFolder(dir: string): string {
    if (path.isAbsolute(dir)) return path.resolve(dir);

    const root = botFiles()?.root;
    if (!root) throw new SeedcordError(SeedcordErrorCode.CoreDirectoryRootUnknown, [dir]);
    return resolveFromRoot(root, dir);
}

// a plain script or test has no config to list folders
export function assertListedFolder(folder: string): void {
    const bot = botFiles();
    if (!bot) return;

    const root = path.resolve(bot.root);
    if (!isInside(root, folder)) throw new SeedcordError(SeedcordErrorCode.CorePathOutsideRoot, [folder, root]);
    if (!bot.listed.some((listedFolder) => isInside(path.join(root, listedFolder), folder))) {
        throw new SeedcordError(SeedcordErrorCode.CoreDirectoryNotListed, [folder]);
    }
}
