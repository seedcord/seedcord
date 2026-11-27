import { mkdir, mkdtempDisposable, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export interface TempProject extends AsyncDisposable {
    root: string;
}

// keys are paths under the project's folder
export async function tempProject(files: Record<string, string>): Promise<TempProject> {
    const folder = await mkdtempDisposable(join(tmpdir(), 'seedcord-project-'));
    const root = await realpath(folder.path);
    for (const [file, content] of Object.entries(files)) {
        await mkdir(dirname(join(root, file)), { recursive: true });
        await writeFile(join(root, file), content);
    }
    return { root, [Symbol.asyncDispose]: () => folder.remove() };
}
