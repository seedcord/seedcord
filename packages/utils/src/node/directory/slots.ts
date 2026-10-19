import { existsSync } from 'node:fs';
import * as path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { resolveFromRoot } from '#src/node/paths';

export type ModuleLoader = () => Promise<Record<string, unknown>>;
export type TextLoader = () => Promise<string>;

export interface BuiltFileLoaders {
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

// seedcord build writes a BuiltFileLoaders object here from the entry it generates
export const BUILT_FILES_KEY = 'seedcord:utils:built-files';
// the generated entry calls the function here right after it writes the built files
export const BUILT_FILES_READY_KEY = 'seedcord:utils:built-files-ready';

// a global because dev loads the bot with its own copy of this module
const ROOT_SLOT = Symbol.for('seedcord:utils:root');

export function builtFiles(): BuiltFileLoaders | undefined {
    return Reflect.get(globalThis, Symbol.for(BUILT_FILES_KEY)) as BuiltFileLoaders | undefined;
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
    if (root === undefined) Reflect.deleteProperty(globalThis, ROOT_SLOT);
    else Reflect.set(globalThis, ROOT_SLOT, root);
}

function devRoot(): string | undefined {
    const root: unknown = Reflect.get(globalThis, ROOT_SLOT);
    return typeof root === 'string' ? root : undefined;
}

export function resolveFolder(dir: string): string {
    if (path.isAbsolute(dir)) return path.resolve(dir);

    const root = builtFiles()?.root ?? devRoot();
    if (!root) throw new SeedcordError(SeedcordErrorCode.CoreDirectoryRootUnknown, [dir]);
    return resolveFromRoot(root, dir);
}
