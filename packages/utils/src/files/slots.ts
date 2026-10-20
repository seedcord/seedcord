import { existsSync } from 'node:fs';
import * as path from 'node:path';

import { BotLayout } from './BotLayout';

import type { BotLayoutData } from './BotLayout';
import type { EncodedFile } from './encodedFile';

export type ModuleLoader = () => Promise<Record<string, unknown>>;
type EncodedFileLoader = () => Promise<EncodedFile>;

export interface BuiltSlot extends BotLayoutData {
    kind: 'built';
    // every folder under root, empty ones included
    folders: string[];
    modules: Record<string, ModuleLoader>;
    listedFiles: Record<string, EncodedFileLoader>;
    // seedcord dev runs the source files themselves
    sourcePaths?: boolean;
}

// server dev reads the files off disk
export interface DevSlot extends BotLayoutData {
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

export function botConfigDir(): string | undefined {
    const slot = botFilesSlot();
    const configFile = slot && new BotLayout(slot).configFile;
    // a bun binary's root is under /$bunfs
    return configFile !== undefined && existsSync(configFile) ? path.dirname(configFile) : undefined;
}

function writeSlot(slot: BotFilesSlot): Disposable {
    const key = Symbol.for(BOT_FILES_KEY);
    Reflect.set(globalThis, key, slot);
    return { [Symbol.dispose]: () => Reflect.deleteProperty(globalThis, key) };
}

export function setDevFiles(dev: Omit<DevSlot, 'kind'>): Disposable {
    return writeSlot({ kind: 'dev', ...dev });
}

// the generated entry writes the same object without importing seedcord
export function setBuiltFiles(built: Omit<BuiltSlot, 'kind'>): Disposable {
    return writeSlot({ kind: 'built', ...built });
}
