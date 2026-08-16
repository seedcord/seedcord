interface Env {
    ASSETS: { fetch(request: Request): Promise<Response> };
}

const TRAILING_SLASH_REDIRECT = 307;
const PERMANENT_REDIRECT = 308;

// RFC 8288 discovery hints for agents
const LINK_HEADER = '<https://docs.seedcord.org/>; rel="service-doc", <https://seedcord.org/>; rel="index"';

const handler = {
    async fetch(request: Request, env: Env): Promise<Response> {
        const asset = await env.ASSETS.fetch(request);

        // collapse the slash/non-slash duplicate into one permanent redirect
        const normalized =
            asset.status === TRAILING_SLASH_REDIRECT && asset.headers.has('location')
                ? new Response(null, { status: PERMANENT_REDIRECT, headers: asset.headers })
                : asset;

        const response = new Response(normalized.body, normalized);
        if ((normalized.headers.get('content-type') ?? '').includes('text/html')) {
            response.headers.set('Link', LINK_HEADER);
        }
        // every page is still a placeholder
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return response;
    }
};

// eslint-disable-next-line import/no-default-export -- Cloudflare Worker entrypoint
export default handler;
