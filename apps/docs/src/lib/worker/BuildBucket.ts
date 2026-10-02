import type { DocsBucket, DocsObject } from '#lib/worker/DocsWorker';
import type { SiteBuild } from '@seedcord/docs-engine/client';

// reads the R2 folder of the build that `wrangler deploy --var BUILD_ID` pointed this worker at
export class BuildBucket implements DocsBucket {
    constructor(
        private readonly bucket: DocsBucket,
        private readonly build: SiteBuild
    ) {}

    get(key: string): Promise<DocsObject | null> {
        return this.bucket.get(this.build.key(key));
    }
}
