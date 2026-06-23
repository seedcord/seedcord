interface Env {
    ASSETS: { fetch(request: Request): Promise<Response> };
}

// every other host serves the same content, so it gets an X-Robots-Tag noindex to keep duplicates out of Google
const PRODUCTION_HOST = 'seedcord.org';

const TRAILING_SLASH_REDIRECT = 307;
const PERMANENT_REDIRECT = 308;

const handler = {
    async fetch(request: Request, env: Env): Promise<Response> {
        const asset = await env.ASSETS.fetch(request);

        // collapse the slash/non-slash duplicate into one permanent redirect
        const normalized =
            asset.status === TRAILING_SLASH_REDIRECT && asset.headers.has('location')
                ? new Response(null, { status: PERMANENT_REDIRECT, headers: asset.headers })
                : asset;

        if (new URL(request.url).hostname === PRODUCTION_HOST) return normalized;

        const response = new Response(normalized.body, normalized);
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return response;
    }
};

export default handler;
