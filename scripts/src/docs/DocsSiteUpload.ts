import { SiteBuild } from '@seedcord/docs-engine';

import type { DocsSiteFile } from '#src/docs/DocsSiteFiles';

export interface SiteBucket {
    putFile(key: string, filePath: string): Promise<void>;
    folders(prefix: string): Promise<string[]>;
    deleteFolder(folder: string): Promise<void>;
}

const INDEX = 'index.json';
const WRITES_AT_ONCE = 64;

export class DocsSiteUpload {
    constructor(private readonly bucket: SiteBucket) {}

    async upload(build: SiteBuild, files: readonly DocsSiteFile[]): Promise<number> {
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
        return files.length;
    }

    async prune(live: SiteBuild, rollbackId: string | null): Promise<string[]> {
        const builds = await this.builds();
        const retired = builds.filter((build) => build.isOlderThan(live) && build.id !== rollbackId);
        for (const build of retired) await this.bucket.deleteFolder(build.folder);
        return retired.map(({ id }) => id);
    }

    private async builds(): Promise<SiteBuild[]> {
        const folders = await this.bucket.folders(SiteBuild.ROOT);
        return folders.flatMap((folder) => SiteBuild.fromFolder(folder) ?? []);
    }
}
