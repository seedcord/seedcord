import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { beforeAll, describe, expect, it } from 'vite-plus/test';

import { writeFiles } from '#tests/tempProject';

import { fixtureCopy, HTTP_BOT } from './fixtureCopy';
import { quickBuildRunner } from './quickBuildRunner';

describe('seedcord build on a node bot with web pages', () => {
    let clientDir = '';

    beforeAll(async () => {
        const copy = await fixtureCopy(HTTP_BOT);
        clientDir = join(copy.path, 'dist/client');
        await writeFiles(copy.path, {
            'client/uptime/index.html':
                '<html><head></head><body><script type="module" src="./main.ts"></script></body></html>',
            'client/uptime/main.ts': "import './uptime.css';\nimport { start } from '../counter';\nstart();\n",
            'client/uptime/uptime.css': 'body { color: red; }\n',
            'client/counter.ts': "export const start = () => document.body.append('ticking');\n",
            'public/robots.txt': 'User-agent: *\n'
        });
        await quickBuildRunner().run(copy.path);
        return () => copy[Symbol.asyncDispose]();
    }, 120_000);

    it('builds each page to its own folder, with the hashed script and stylesheet linked', async () => {
        const page = await readFile(join(clientDir, 'uptime/index.html'), 'utf8');

        expect(page).toMatch(/<script type="module" crossorigin src="\/assets\/index-[\w-]+\.js"><\/script>/);
        expect(page).toMatch(/<link rel="stylesheet" crossorigin href="\/assets\/index-[\w-]+\.css">/);
    });

    it('puts only the pages, their assets and public/ in the client folder', async () => {
        const served = await readdir(clientDir, { recursive: true });

        expect(served.toSorted()).toEqual([
            'assets',
            expect.stringMatching(/^assets\/index-.+\.css$/),
            expect.stringMatching(/^assets\/index-.+\.js$/),
            'robots.txt',
            'uptime',
            'uptime/index.html'
        ]);
    });
});

describe('seedcord build refusing a layout that would serve the wrong files', () => {
    it('throws CliBuildClientFolderTaken for a client folder of bot code in root beside pages', async () => {
        await using copy = await fixtureCopy(HTTP_BOT);
        await writeFiles(copy.path, {
            'src/client/widget.ts': 'export {};\n',
            'client/home/index.html': '<p>home</p>'
        });

        await expect(quickBuildRunner().run(copy.path)).rejects.toHaveProperty(
            'code',
            SeedcordErrorCode.CliBuildClientFolderTaken
        );
    }, 120_000);
});
