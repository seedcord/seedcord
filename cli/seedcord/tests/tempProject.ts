import { mkdir, mkdtempDisposable, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export interface TempProject extends AsyncDisposable {
    root: string;
}

export async function writeFiles(root: string, contentByPath: Record<string, string>): Promise<void> {
    for (const [file, content] of Object.entries(contentByPath)) {
        await mkdir(dirname(join(root, file)), { recursive: true });
        await writeFile(join(root, file), content);
    }
}

export async function tempProject(files: Record<string, string>): Promise<TempProject> {
    const folder = await mkdtempDisposable(join(tmpdir(), 'seedcord-project-'));
    const root = await realpath(folder.path);
    await writeFiles(root, files);
    return { root, [Symbol.asyncDispose]: () => folder.remove() };
}
