import { existsSync } from 'node:fs';
import * as path from 'node:path';

import type { EncodedFile } from './encodedFile';

export type ModuleLoader = () => Promise<Record<string, unknown>>;
type EncodedFileLoader = () => Promise<EncodedFile>;

export interface BotFolders {
    root: string;
    // the folders from files in seedcord.config.ts, root-relative like '/locales'
    listed: string[];
}

export interface BuiltSlot extends BotFolders {
    kind: 'built';
    // every folder under root, empty ones included
    folders: string[];
    modules: Record<string, ModuleLoader>;
    listedFiles: Record<string, EncodedFileLoader>;
    // seedcord dev runs the source files themselves
    sourcePaths?: boolean;
    // relative to root. only a server build writes it
    configFile?: string;
}

// server dev reads the files off disk
interface DevSlot extends BotFolders {
    kind: 'dev';
}

type BotFilesSlot = BuiltSlot | DevSlot;

// dev writes this from the CLI's copy of this module. the generated entry writes it without importing seedcord
export const BOT_FILES_KEY = 'seedcord:utils:bot-files';
// the generated entry calls the function here right after it writes the built files
export const BUILT_FILES_READY_KEY = 'seedcord:utils:built-files-ready';

export function botFilesSlot(): BotFilesSlot | undefined {
    return Reflect.get(globalThis, Symbol.for(BOT_FILES_KEY)) as BotFilesSlot | undefined;
}

function builtSlot(): BuiltSlot | undefined {
    const slot = botFilesSlot();
    return slot?.kind === 'built' ? slot : undefined;
}

// an app can import seedcord before the built bot it embeds
export function setBuiltFilesHook(callback: () => void): void {
    if (builtSlot()) callback();
    else Reflect.set(globalThis, Symbol.for(BUILT_FILES_READY_KEY), callback);
}

export function builtConfigDir(): string | undefined {
    const built = builtSlot();
    if (built?.configFile === undefined) return undefined;

    const configFile = path.resolve(built.root, built.configFile);
    // a bun binary's root is under /$bunfs
    return existsSync(configFile) ? path.dirname(configFile) : undefined;
}

export function setDevFiles(folders: BotFolders): Disposable {
    const key = Symbol.for(BOT_FILES_KEY);
    Reflect.set(globalThis, key, { kind: 'dev', ...folders } satisfies DevSlot);
    return { [Symbol.dispose]: () => Reflect.deleteProperty(globalThis, key) };
}
