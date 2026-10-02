import { AssetsBucket } from '#lib/worker/AssetsBucket';
import { DocsWorker } from '#lib/worker/DocsWorker';

import type { AssetsBinding } from '#lib/worker/AssetsBucket';
import type { DocsBucket } from '#lib/worker/DocsWorker';

// wrangler.jsonc binds DOCS in production and ASSETS under --env local
type Env = { DOCS: DocsBucket } | { ASSETS: AssetsBinding };

const handler = {
    fetch(request: Request, env: Env): Promise<Response> {
        const bucket = 'DOCS' in env ? env.DOCS : new AssetsBucket(env.ASSETS);
        return new DocsWorker(bucket).respond(request);
    }
};

export default handler;
