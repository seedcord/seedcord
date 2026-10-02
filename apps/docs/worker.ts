import { SiteBuild } from '@seedcord/docs-engine/client';

import { AssetsBucket } from '#lib/worker/AssetsBucket';
import { BuildBucket } from '#lib/worker/BuildBucket';
import { DocsWorker } from '#lib/worker/DocsWorker';

import type { AssetsBinding } from '#lib/worker/AssetsBucket';
import type { DocsBucket } from '#lib/worker/DocsWorker';

// production binds the R2 bucket. wrangler dev --env preview binds the .preview folder as ASSETS
type Env = ({ DOCS: DocsBucket } | { ASSETS: AssetsBinding }) & { BUILD_ID: string };

function bucketFor(env: Env): DocsBucket {
    const storage = 'DOCS' in env ? env.DOCS : new AssetsBucket(env.ASSETS);
    return new BuildBucket(storage, new SiteBuild(env.BUILD_ID));
}

const handler = {
    fetch(request: Request, env: Env): Promise<Response> {
        return new DocsWorker(bucketFor(env)).respond(request);
    }
};

export default handler;
