import { fileUrl } from '@seedcord/utils/internal';

let testImports = 0;

export async function importFile(file: string, query = ''): Promise<Record<string, unknown>> {
    // @vite-ignore stops vite warning that it can't analyze this import.
    // justified: a dynamic import resolves to an untyped export map
    return (await import(/* @vite-ignore */ `${fileUrl(file)}${query}`)) as Record<string, unknown>;
}

// vitest keeps a saved file in its module graph. the query makes it import the file again
export function importSaved(file: string): Promise<Record<string, unknown>> {
    return importFile(file, process.env.VITEST === 'true' ? `?update=${String(++testImports)}` : '');
}
