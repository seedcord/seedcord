import { mkdirSync, mkdtempDisposableSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, onTestFinished } from 'vite-plus/test';

import { setBuiltFiles, setDevFiles } from '#src/files/slots';
import { folderEmojis } from '#src/files/sources';

// a project with its code in src and an emojis folder beside it
function projectWithEmojis(...files: string[]): string {
    const project = mkdtempDisposableSync(path.join(tmpdir(), 'seedcord-emojis-'));
    onTestFinished(() => project.remove());
    mkdirSync(path.join(project.path, 'emojis'));
    for (const file of files) writeFileSync(path.join(project.path, 'emojis', file), '');
    return project.path;
}

describe('folderEmojis', () => {
    it('reads the folder from disk under seedcord dev', async () => {
        const project = projectWithEmojis('dot.png', 'confirmation_check.avif');
        using _dev = setDevFiles({
            root: path.join(project, 'src'),
            listed: [],
            skippedFolders: [],
            emojiFolder: '/../emojis'
        });

        expect(await folderEmojis()).toEqual([
            { key: 'ConfirmationCheck', name: 'confirmation_check' },
            { key: 'Dot', name: 'dot' }
        ]);
    });

    it('reads the list that the build wrote in a built bot', async () => {
        using _built = setBuiltFiles({
            root: path.resolve('/bot'),
            listed: [],
            skippedFolders: [],
            folders: [],
            modules: {},
            listedFiles: {},
            emojis: [{ key: 'Dot', name: 'dot' }]
        });

        expect(await folderEmojis()).toEqual([{ key: 'Dot', name: 'dot' }]);
    });

    it('is empty for a script that runs without a config', async () => {
        expect(await folderEmojis()).toEqual([]);
    });
});
