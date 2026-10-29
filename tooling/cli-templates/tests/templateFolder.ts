import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// a templates folder on disk, keyed by the path inside it
export async function templateFolder(files: Record<string, string>): Promise<AsyncDisposable & { path: string }> {
    const folder = await mkdtempDisposable(join(tmpdir(), 'templates-'));
    for (const [path, contents] of Object.entries(files)) {
        await mkdir(dirname(join(folder.path, path)), { recursive: true });
        await writeFile(join(folder.path, path), contents);
    }
    return folder;
}
