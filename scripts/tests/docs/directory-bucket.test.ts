import { mkdtempDisposable, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { DirectoryBucket } from '#src/docs/DirectoryBucket';

async function scratch(): Promise<{ root: string; source: string }> {
    const tmp = await mkdtempDisposable(path.join(tmpdir(), 'docs-preview-'));
    onTestFinished(() => tmp.remove());
    const root = tmp.path;
    const source = path.join(root, 'source.html');
    await writeFile(source, '<html>');
    return { root: path.join(root, 'bucket'), source };
}

describe('DirectoryBucket', () => {
    it('copies a file to its key below the root', async () => {
        const { root, source } = await scratch();

        await new DirectoryBucket(root).putFile('builds/a/packages/core/latest.html', source);

        await expect(readFile(path.join(root, 'builds/a/packages/core/latest.html'), 'utf8')).resolves.toBe('<html>');
    });

    it('lists the folders below a prefix and deletes one', async () => {
        const { root, source } = await scratch();
        const bucket = new DirectoryBucket(root);
        await bucket.putFile('builds/a/index.html', source);
        await bucket.putFile('builds/b/index.html', source);

        await bucket.deleteFolder('builds/a/');

        await expect(bucket.folders('builds/')).resolves.toEqual(['builds/b/']);
    });

    it('lists nothing before the first upload', async () => {
        const { root } = await scratch();
        await expect(new DirectoryBucket(root).folders('builds/')).resolves.toEqual([]);
    });

    it('throws when the prefix is a file', async () => {
        const { root, source } = await scratch();
        const bucket = new DirectoryBucket(root);
        await bucket.putFile('builds', source);

        await expect(bucket.folders('builds/')).rejects.toThrow(/ENOTDIR/);
    });
});
