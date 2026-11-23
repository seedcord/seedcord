import { cp, rm } from 'node:fs/promises';
import path from 'node:path';

export interface TempCatalog extends AsyncDisposable {
    path: string;
}

// a copy of a fixture catalog that a test can save files into
export async function tempCatalog(fixture: string, name: string): Promise<TempCatalog> {
    const folder = path.join(import.meta.dirname, 'temp', name);
    await cp(path.join(import.meta.dirname, 'fixtures', fixture), folder, { recursive: true });

    return { path: folder, [Symbol.asyncDispose]: () => rm(folder, { recursive: true, force: true }) };
}
