interface Env {
    ASSETS: { fetch(request: Request): Promise<Response> };
}

// every other host serves the same content, so it gets an X-Robots-Tag noindex to keep duplicates out of Google
const PRODUCTION_HOST = 'seedcord.org';

const TRAILING_SLASH_REDIRECT = 307;
const PERMANENT_REDIRECT = 308;

// RFC 8288 discovery hints for agents, points at the human docs + the machine-readable index
const LINK_HEADER = '<https://docs.seedcord.org/>; rel="service-doc", </llms.txt>; rel="alternate"; type="text/plain"';

const handler = {
    async fetch(request: Request, env: Env): Promise<Response> {
        const asset = await env.ASSETS.fetch(request);

        // collapse the slash/non-slash duplicate into one permanent redirect
        const normalized =
            asset.status === TRAILING_SLASH_REDIRECT && asset.headers.has('location')
                ? new Response(null, { status: PERMANENT_REDIRECT, headers: asset.headers })
                : asset;

        const isHtml = (normalized.headers.get('content-type') ?? '').includes('text/html');
        const isProduction = new URL(request.url).hostname === PRODUCTION_HOST;

        // assets on the production host pass straight through, only documents carry the Link hint
        if (isProduction && !isHtml) return normalized;

        const response = new Response(normalized.body, normalized);
        if (isHtml) response.headers.set('Link', LINK_HEADER);
        if (!isProduction) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return response;
    }
};

// eslint-disable-next-line import/no-default-export -- Cloudflare Worker entrypoint
export default handler;
