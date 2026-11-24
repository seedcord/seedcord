import { fileUrl } from '@seedcord/utils/internal';

let testImports = 0;

export async function importFile(file: string, query = ''): Promise<Record<string, unknown>> {
    // we don't want vite warning about every import() for dynamic paths like below
    // justified: a dynamic import resolves to an untyped export map
    return (await import(/* @vite-ignore */ `${fileUrl(file)}${query}`)) as Record<string, unknown>;
}

// under seedcord dev, vite runs a saved file again the next time something imports it.
// vitest runs without a real vite server managing the module graph, and the query makes it run the file again
export function importSaved(file: string): Promise<Record<string, unknown>> {
    return importFile(file, process.env.VITEST === 'true' ? `?update=${String(++testImports)}` : '');
}
