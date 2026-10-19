import { existsSync } from 'node:fs';
import * as path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { resolveFromRoot } from '#src/node/paths';

export type ModuleLoader = () => Promise<Record<string, unknown>>;
export type TextLoader = () => Promise<string>;

export interface BuiltFileLoaders {
    kind: 'built';
    root: string;
    // every folder under root, empty ones included
    folders: string[];
    modules: Record<string, ModuleLoader>;
    text: Record<string, TextLoader>;
    // seedcord dev runs the source files themselves
    sourcePaths?: boolean;
    // relative to root. only a server build writes it
    configFile?: string;
}

// server dev reads the files off disk
interface DiskRoot {
    kind: 'disk';
    root: string;
}

type BotFiles = BuiltFileLoaders | DiskRoot;

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

export function setBotRoot(root: string | undefined): void {
    const key = Symbol.for(BOT_FILES_KEY);
    if (root === undefined) Reflect.deleteProperty(globalThis, key);
    else Reflect.set(globalThis, key, { kind: 'disk', root } satisfies DiskRoot);
}

export function resolveFolder(dir: string): string {
    if (path.isAbsolute(dir)) return path.resolve(dir);

    const root = botFiles()?.root;
    if (!root) throw new SeedcordError(SeedcordErrorCode.CoreDirectoryRootUnknown, [dir]);
    return resolveFromRoot(root, dir);
}
