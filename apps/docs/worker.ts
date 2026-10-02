import { SiteBuild } from '@seedcord/docs-engine/client';

import { AssetsBucket } from '#lib/worker/AssetsBucket';
import { BuildBucket } from '#lib/worker/BuildBucket';
import { DocsWorker } from '#lib/worker/DocsWorker';

import type { AssetsBinding } from '#lib/worker/AssetsBucket';
import type { DocsBucket } from '#lib/worker/DocsWorker';

// production binds the bucket and a BUILD_ID var. wrangler dev --env local binds ASSETS
type Env = { DOCS: DocsBucket; BUILD_ID: string } | { ASSETS: AssetsBinding };

function bucketFor(env: Env): DocsBucket {
    return 'DOCS' in env ? new BuildBucket(env.DOCS, new SiteBuild(env.BUILD_ID)) : new AssetsBucket(env.ASSETS);
}

const handler = {
    fetch(request: Request, env: Env): Promise<Response> {
        return new DocsWorker(bucketFor(env)).respond(request);
    }
};

export default handler;
