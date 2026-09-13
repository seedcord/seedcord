import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { readPublished } from '#src/lib/published-packages';

const CORE = '[{"name":"@seedcord/core","version":"0.7.0"}]';

describe('readPublished', () => {
    it('reads the inline json', async () => {
        await expect(readPublished({ published: CORE })).resolves.toEqual([
            { name: '@seedcord/core', version: '0.7.0' }
        ]);
    });

    it('reads the json from a file, which wins over the inline flag', async () => {
        const file = path.join(await mkdtemp(path.join(tmpdir(), 'published-')), 'published.json');
        await writeFile(file, CORE);

        await expect(readPublished({ published: '[]', 'published-file': file })).resolves.toEqual([
            { name: '@seedcord/core', version: '0.7.0' }
        ]);
    });

    it('throws naming both flags when neither is passed', async () => {
        await expect(readPublished({})).rejects.toThrow(/--published-file/);
    });

    it('rejects json that is not an array', async () => {
        await expect(readPublished({ published: '{}' })).rejects.toThrow(/JSON array/);
    });

    it('rejects a null entry', async () => {
        await expect(readPublished({ published: '[null]' })).rejects.toThrow(/name and version/);
    });

    it('rejects an entry without a string version', async () => {
        await expect(readPublished({ published: '[{"name":"@seedcord/core","version":7}]' })).rejects.toThrow(
            /name and version/
        );
    });
});
