import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

export interface TempFolder extends AsyncDisposable {
    path: string;
}

export async function tempFolder(name: string): Promise<TempFolder> {
    const folder = path.join(import.meta.dirname, '..', 'temp', name);
    await mkdir(folder, { recursive: true });

    return { path: folder, [Symbol.asyncDispose]: () => rm(folder, { recursive: true, force: true }) };
}
