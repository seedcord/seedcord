import type { DocsBucket, DocsObject } from '#lib/worker/DocsWorker';

export interface AssetsBinding {
    fetch(request: Request): Promise<Response>;
}

const NOT_FOUND = 404;

// reads dist/docs through the assets binding wrangler dev --env local sets up
export class AssetsBucket implements DocsBucket {
    constructor(private readonly assets: AssetsBinding) {}

    async get(key: string): Promise<DocsObject | null> {
        const response = await this.assets.fetch(new Request(`https://assets.local/${encodeURI(key)}`));
        if (response.status === NOT_FOUND || response.body === null) return null;
        return { body: response.body, httpEtag: response.headers.get('etag') ?? '' };
    }
}
