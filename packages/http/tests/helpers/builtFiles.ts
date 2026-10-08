import { BUILT_FILES_KEY } from '@seedcord/utils/node/internal';

// where an edge bot's files sit
export const BUILT_ROOT = '/bot';

function foldersOf(keys: readonly string[]): string[] {
    const folders = new Set<string>();
    for (const key of keys) {
        const parts = key.split('/').filter(Boolean).slice(0, -1);
        parts.forEach((_, index) => folders.add(parts.slice(0, index + 1).join('/')));
    }
    return [...folders];
}

// writes the object seedcord build writes onto the slot. keys look like '/handlers/Ping.ts'
export function registerBuiltFiles(modules: Record<string, Record<string, unknown>>): void {
    Reflect.set(globalThis, Symbol.for(BUILT_FILES_KEY), {
        root: BUILT_ROOT,
        folders: foldersOf(Object.keys(modules)),
        modules: Object.fromEntries(
            Object.entries(modules).map(([key, exported]) => [key, () => Promise.resolve(exported)])
        ),
        text: {}
    });
}

export function clearBuiltFiles(): void {
    Reflect.deleteProperty(globalThis, Symbol.for(BUILT_FILES_KEY));
}
