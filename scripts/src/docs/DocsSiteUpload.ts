import { SiteBuild } from '@seedcord/docs-engine';

import type { DocsSiteFile } from '#src/docs/DocsSiteFiles';

export interface SiteBucket {
    putFile(key: string, filePath: string): Promise<void>;
    folders(prefix: string): Promise<string[]>;
    deleteFolder(folder: string): Promise<void>;
}

export interface UploadSummary {
    written: number;
    deleted: string[];
}

const INDEX = 'index.json';
const WRITES_AT_ONCE = 64;
// a cloudflare rollback to the previous worker version reads the previous build
const OLDER_BUILDS_KEPT = 1;

export class DocsSiteUpload {
    constructor(private readonly bucket: SiteBucket) {}

    async run(build: SiteBuild, files: readonly DocsSiteFile[]): Promise<UploadSummary> {
        if (!files.some(({ key }) => key === INDEX)) {
            throw new Error(`the docs export has no ${INDEX}. run \`pnpm -C apps/docs build\` first`);
        }

        for (let start = 0; start < files.length; start += WRITES_AT_ONCE) {
            await Promise.all(
                files
                    .slice(start, start + WRITES_AT_ONCE)
                    .map(({ key, path }) => this.bucket.putFile(build.key(key), path))
            );
        }

        const stale = await this.olderThanKept(build);
        for (const old of stale) await this.bucket.deleteFolder(old.folder);

        return { written: files.length, deleted: stale.map(({ id }) => id) };
    }

    private async olderThanKept(current: SiteBuild): Promise<SiteBuild[]> {
        const folders = await this.bucket.folders(SiteBuild.ROOT);
        const older = folders.reduce<SiteBuild[]>((builds, folder) => {
            const build = SiteBuild.fromFolder(folder);
            if (build?.isOlderThan(current)) builds.push(build);
            return builds;
        }, []);

        const newestFirst = older.sort((a, b) => (b.isOlderThan(a) ? -1 : 1));
        return newestFirst.slice(OLDER_BUILDS_KEPT);
    }
}
