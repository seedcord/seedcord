import { SiteBuild } from '@seedcord/docs-engine';
import { describe, expect, it } from 'vitest';

import { DocsSiteUpload } from '#src/docs/DocsSiteUpload';

import type { DocsSiteFile } from '#src/docs/DocsSiteFiles';
import type { SiteBucket } from '#src/docs/DocsSiteUpload';

class FakeBucket implements SiteBucket {
    readonly written: string[] = [];
    readonly deleted = new Set<string>();

    constructor(private readonly existing: SiteBuild[] = []) {}

    putFile(key: string): Promise<void> {
        this.written.push(key);
        return Promise.resolve();
    }

    folders(): Promise<string[]> {
        return Promise.resolve(
            this.existing.filter((build) => !this.deleted.has(build.folder)).map((build) => build.folder)
        );
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
        const bucket = new FakeBucket([build(1), build(2)]);

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

describe('DocsSiteUpload.prune', () => {
    it('keeps the build a rollback goes to and deletes the older ones', async () => {
        const bucket = new FakeBucket([build(1), build(2), build(3), build(4)]);

        const deleted = await new DocsSiteUpload(bucket).prune(build(4), build(2).id);

        expect(bucket.deleted).toEqual(new Set([build(1).folder, build(3).folder]));
        expect(new Set(deleted)).toEqual(new Set([build(1).id, build(3).id]));
    });

    it('keeps the rollback build when it runs twice for the same deploy', async () => {
        const bucket = new FakeBucket([build(1), build(2), build(3)]);
        const site = new DocsSiteUpload(bucket);

        await site.prune(build(3), build(2).id);
        await site.prune(build(3), build(2).id);

        expect(bucket.deleted).toEqual(new Set([build(1).folder]));
    });

    it('leaves a newer build alone', async () => {
        const bucket = new FakeBucket([build(9)]);

        await new DocsSiteUpload(bucket).prune(build(4), null);

        expect(bucket.deleted.size).toBe(0);
    });

    it('deletes every older build when there is nothing to roll back to', async () => {
        const bucket = new FakeBucket([build(1), build(2), build(3)]);

        await new DocsSiteUpload(bucket).prune(build(3), null);

        expect(bucket.deleted).toEqual(new Set([build(1).folder, build(2).folder]));
    });
});
