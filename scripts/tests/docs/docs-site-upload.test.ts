import { SiteBuild } from '@seedcord/docs-engine';
import { describe, expect, it } from 'vitest';

import { DocsSiteUpload } from '#src/docs/DocsSiteUpload';

import type { DocsSiteFile } from '#src/docs/DocsSiteFiles';
import type { SiteBucket } from '#src/docs/DocsSiteUpload';

class FakeBucket implements SiteBucket {
    readonly written: string[] = [];
    readonly deleted = new Set<string>();
    private readonly texts = new Map<string, string>();

    constructor(
        private readonly existing: SiteBuild[] = [],
        live?: SiteBuild
    ) {
        if (live) this.texts.set(DocsSiteUpload.LIVE_KEY, live.id);
    }

    putFile(key: string): Promise<void> {
        this.written.push(key);
        return Promise.resolve();
    }

    readText(key: string): Promise<string | null> {
        return Promise.resolve(this.texts.get(key) ?? null);
    }

    writeText(key: string, text: string): Promise<void> {
        this.texts.set(key, text);
        return Promise.resolve();
    }

    folders(): Promise<string[]> {
        return Promise.resolve(this.existing.map((build) => build.folder));
    }

    deleteFolder(folder: string): Promise<void> {
        this.deleted.add(folder);
        return Promise.resolve();
    }
}

const files = (...keys: string[]): DocsSiteFile[] => keys.map((key) => ({ key, path: `/export/${key}` }));

const build = (day: number): SiteBuild => new SiteBuild(`202610${String(day).padStart(2, '0')}T000000Z-abc1234`);

describe('DocsSiteUpload.upload', () => {
    it('writes every file into the folder of its build and deletes nothing', async () => {
        const bucket = new FakeBucket([build(1), build(2)], build(2));

        await new DocsSiteUpload(bucket).upload(build(5), files('index.html', 'index.json'));

        expect(bucket.written).toEqual([build(5).key('index.html'), build(5).key('index.json')]);
        expect(bucket.deleted.size).toBe(0);
    });

    it('refuses an export without index.json before it touches the bucket', async () => {
        const bucket = new FakeBucket();

        await expect(new DocsSiteUpload(bucket).upload(build(4), files('index.html'))).rejects.toThrow(/index\.json/);
        expect(bucket.written).toEqual([]);
    });
});

describe('DocsSiteUpload.promote', () => {
    it('keeps the build that was live before for a rollback and deletes the older ones', async () => {
        const bucket = new FakeBucket([build(1), build(2), build(3)], build(3));

        const deleted = await new DocsSiteUpload(bucket).promote(build(4));

        expect(bucket.deleted).toEqual(new Set([build(1).folder, build(2).folder]));
        expect(new Set(deleted)).toEqual(new Set([build(1).id, build(2).id]));
    });

    it('keeps the live build when the run before this one never deployed', async () => {
        const bucket = new FakeBucket([build(1), build(2)], build(1));

        await new DocsSiteUpload(bucket).promote(build(3));

        expect(bucket.deleted).toEqual(new Set([build(2).folder]));
    });

    it('records the promoted build as the live one', async () => {
        const bucket = new FakeBucket([build(1)], build(1));
        const site = new DocsSiteUpload(bucket);

        await site.promote(build(2));
        await site.promote(build(3));

        expect(bucket.deleted).toEqual(new Set([build(1).folder]));
    });

    it('leaves a newer build alone', async () => {
        const bucket = new FakeBucket([build(9)], build(1));

        await new DocsSiteUpload(bucket).promote(build(4));

        expect(bucket.deleted.size).toBe(0);
    });

    it('deletes nothing before any build was recorded as live', async () => {
        const bucket = new FakeBucket([build(1), build(2)]);

        await new DocsSiteUpload(bucket).promote(build(3));

        expect(bucket.deleted.size).toBe(0);
    });
});
