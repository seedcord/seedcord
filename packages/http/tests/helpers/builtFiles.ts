import { BOT_FILES_KEY, setBuiltFiles } from '@seedcord/utils/internal';

// the root seedcord build gives every edge worker
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
export function registerBuiltFiles(
    modules: Record<string, Record<string, unknown>>,
    emptyFolders: readonly string[] = []
): Disposable {
    return setBuiltFiles({
        root: BUILT_ROOT,
        listed: [],
        skippedFolders: [],
        folders: [...new Set([...foldersOf(Object.keys(modules)), ...emptyFolders])],
        modules: Object.fromEntries(
            Object.entries(modules).map(([key, exported]) => [key, () => Promise.resolve(exported)])
        ),
        listedFiles: {}
    });
}

export function clearBuiltFiles(): void {
    Reflect.deleteProperty(globalThis, Symbol.for(BOT_FILES_KEY));
}
