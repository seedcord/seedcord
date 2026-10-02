import { SiteBuild } from '@seedcord/docs-engine';
import { describe, expect, it } from 'vitest';

import { DocsSiteUpload } from '#src/docs/DocsSiteUpload';

import type { DocsSiteFile } from '#src/docs/DocsSiteFiles';
import type { SiteBucket } from '#src/docs/DocsSiteUpload';

class FakeBucket implements SiteBucket {
    readonly written: string[] = [];
    readonly deleted: string[] = [];

    constructor(private readonly existing: SiteBuild[] = []) {}

    putFile(key: string): Promise<void> {
        this.written.push(key);
        return Promise.resolve();
    }

    folders(): Promise<string[]> {
        return Promise.resolve(this.existing.map((build) => build.folder));
    }

    deleteFolder(folder: string): Promise<void> {
        this.deleted.push(folder);
        return Promise.resolve();
    }
}

const files = (...keys: string[]): DocsSiteFile[] => keys.map((key) => ({ key, path: `/export/${key}` }));

const build = (day: number): SiteBuild => new SiteBuild(`202610${String(day).padStart(2, '0')}T000000Z-abc1234`);

describe('DocsSiteUpload', () => {
    it('writes every file into the folder of its build', async () => {
        const bucket = new FakeBucket();

        await new DocsSiteUpload(bucket).run(build(5), files('index.html', 'index.json'));

        expect(bucket.written).toEqual([build(5).key('index.html'), build(5).key('index.json')]);
    });

    it('keeps the previous build for rollback and deletes the older ones', async () => {
        const bucket = new FakeBucket([build(1), build(2), build(3)]);

        const summary = await new DocsSiteUpload(bucket).run(build(4), files('index.json'));

        expect(bucket.deleted).toEqual([build(2).folder, build(1).folder]);
        expect(summary.deleted).toEqual([build(2).id, build(1).id]);
    });

    it('leaves a newer build alone', async () => {
        const bucket = new FakeBucket([build(9)]);

        await new DocsSiteUpload(bucket).run(build(4), files('index.json'));

        expect(bucket.deleted).toEqual([]);
    });

    it('refuses an export without index.json before it touches the bucket', async () => {
        const bucket = new FakeBucket([build(1), build(2)]);

        await expect(new DocsSiteUpload(bucket).run(build(4), files('index.html'))).rejects.toThrow(/index\.json/);
        expect(bucket.written).toEqual([]);
        expect(bucket.deleted).toEqual([]);
    });
});
