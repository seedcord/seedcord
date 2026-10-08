import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { LinkChecker } from '#lib/export/LinkChecker';

const INDEX = {
    schemaVersion: 1,
    updatedAt: '2026-10-02T00:00:00.000Z',
    pathTemplates: { stable: '{name}/{version}', prerelease: '{name}/next/{version}' },
    packages: {
        core: {
            fullName: '@seedcord/core',
            stable: { latest: '0.9.2', latestByMinor: { '0.9': '0.9.2' }, latestByMajor: { '0': '0.9.2' } },
            prerelease: null
        }
    }
};

let root: string;

async function page(file: string, ...hrefs: string[]): Promise<void> {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), hrefs.map((href) => `<a href="${href}">x</a>`).join(''));
}

describe('the export link check', () => {
    beforeEach(async () => {
        const tmp = await mkdtempDisposable(path.join(tmpdir(), 'docs-export-'));
        root = tmp.path;
        await writeFile(path.join(root, 'index.json'), JSON.stringify(INDEX));
        await page('404.html');
        await page('packages/core/0.9.2/classes/bus.html');
        return () => tmp.remove();
    });

    it('reports a link to a page the export never wrote', async () => {
        await page('index.html', '/docs/packages/core/0.9.2/classes/bus', '/docs/packages/core/0.9.2/classes/ghost');

        expect(await new LinkChecker(root).broken()).toEqual([
            { href: '/docs/packages/core/0.9.2/classes/ghost', page: 'index.html', status: 404 }
        ]);
    });

    it('follows the redirect a trailing slash gets', async () => {
        await page('index.html', '/docs/packages/core/0.9.2/classes/bus/');

        expect(await new LinkChecker(root).broken()).toEqual([]);
    });

    it('checks only links into the docs site', async () => {
        await page('index.html', 'https://github.com/seedcord/seedcord', '/guide/', '#members');

        expect(await new LinkChecker(root).broken()).toEqual([]);
    });

    it('reports a page link that left out the docs path', async () => {
        await page('index.html', '/packages/core/0.9.2/classes/bus');

        expect(await new LinkChecker(root).broken()).toEqual([
            { href: '/packages/core/0.9.2/classes/bus', page: 'index.html', status: 404 }
        ]);
    });

    it('checks a link written with the full docs url', async () => {
        await page('index.html', 'https://seedcord.org/docs/packages/core/0.9.2/classes/ghost');

        expect(await new LinkChecker(root).broken()).toEqual([
            { href: 'https://seedcord.org/docs/packages/core/0.9.2/classes/ghost', page: 'index.html', status: 404 }
        ]);
    });

    it('reports a path that only starts with the docs path', async () => {
        await page('index.html', '/docs-old/x');

        expect(await new LinkChecker(root).broken()).toEqual([
            { href: '/docs-old/x', page: 'index.html', status: 404 }
        ]);
    });
});
