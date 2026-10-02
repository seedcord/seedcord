import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DocsSiteFiles } from '#src/docs/DocsSiteFiles';

async function exportDir(...files: string[]): Promise<string> {
    const root = await mkdtemp(path.join(tmpdir(), 'docs-site-'));
    for (const file of files) {
        await mkdir(path.dirname(path.join(root, file)), { recursive: true });
        await writeFile(path.join(root, file), file);
    }
    return root;
}

describe('DocsSiteFiles', () => {
    it('keys every exported file by its path below the export folder', async () => {
        const root = await exportDir('index.html', 'packages/core/latest.html', '_next/static/chunks/app.js');

        const files = await new DocsSiteFiles(root).list();

        expect(files.map((file) => file.key).sort()).toEqual([
            '_next/static/chunks/app.js',
            'index.html',
            'packages/core/latest.html'
        ]);
    });

    it('keeps the absolute path of each file for reading', async () => {
        const root = await exportDir('llms/packages/core/latest.md');

        const [file] = await new DocsSiteFiles(root).list();

        expect(file?.path).toBe(path.join(root, 'llms/packages/core/latest.md'));
    });
});
