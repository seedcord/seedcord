import { SiteBuild } from '@seedcord/docs-engine';

import type { DocsSiteFile } from '#src/docs/DocsSiteFiles';

export interface SiteBucket {
    putFile(key: string, filePath: string): Promise<void>;
    readText(key: string): Promise<string | null>;
    writeText(key: string, text: string): Promise<void>;
    folders(prefix: string): Promise<string[]>;
    deleteFolder(folder: string): Promise<void>;
}

const INDEX = 'index.json';
const WRITES_AT_ONCE = 64;

export class DocsSiteUpload {
    static readonly LIVE_KEY = `${SiteBuild.ROOT}live`;

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

    // a cloudflare rollback to the previous worker version reads the build that was live before this one
    async promote(live: SiteBuild): Promise<string[]> {
        const previousId = await this.bucket.readText(DocsSiteUpload.LIVE_KEY);
        await this.bucket.writeText(DocsSiteUpload.LIVE_KEY, live.id);
        if (previousId === null) return [];

        const builds = await this.builds();
        const retired = builds.filter((build) => build.isOlderThan(live) && build.id !== previousId);
        for (const build of retired) await this.bucket.deleteFolder(build.folder);
        return retired.map(({ id }) => id);
    }

    private async builds(): Promise<SiteBuild[]> {
        const folders = await this.bucket.folders(SiteBuild.ROOT);
        return folders.flatMap((folder) => SiteBuild.fromFolder(folder) ?? []);
    }
}
