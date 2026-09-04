import { assetPath, generatedPathFor, publicPath, TWIN } from './src/lib/pageAssets';

interface Env {
    ASSETS: { fetch(request: Request): Promise<Response> };
}

const TRAILING_SLASH_REDIRECT = 307;
const PERMANENT_REDIRECT = 308;
const NOT_FOUND = 404;

// RFC 8288 discovery hints for agents
const SITE_LINKS = [
    '</llms.txt>; rel="describedby"',
    '</.well-known/agent-skills/index.json>; rel="service-meta"',
    '<https://docs.seedcord.org/>; rel="service-doc"',
    '<https://seedcord.org/>; rel="index"'
].join(', ');

// alternate and describedby are the llms.txt v2 relations
function linkHeader(pathname: string): string {
    return `<${publicPath(pathname, TWIN)}>; rel="alternate"; type="text/markdown", ${SITE_LINKS}`;
}

const MARKDOWN = 'text/markdown';
const HTML = 'text/html';

// cloudflare serves the extension-less files next writes here with no content-type at all
const TYPED_PATHS: Record<string, string> = {
    '/icon': 'image/png',
    '/apple-icon': 'image/png',
    '/api/search': 'application/json'
};

// RFC 9110 reads an absent q as 1. q=0 rejects the type outright
// a wildcard range scores 0 here. only an exact media type counts
function quality(accept: string, type: string): number {
    for (const range of accept.split(',')) {
        const [media, ...params] = range.split(';').map((part) => part.trim());
        if (media !== type) continue;

        const q = params.find((param) => param.startsWith('q='));
        return q === undefined ? 1 : Number(q.slice(2));
    }

    return 0;
}

// a browser ranks text/html at least as high as anything else it accepts
function wantsMarkdown(request: Request): boolean {
    const accept = request.headers.get('accept') ?? '';
    const markdown = quality(accept, MARKDOWN);
    return markdown > 0 && markdown > quality(accept, HTML);
}

function at(request: Request, pathname: string): Request {
    const url = new URL(request.url);
    url.pathname = pathname;
    return new Request(url, request);
}

// a real file in public/ wins over a page's generated card or twin
async function fromAssets(env: Env, request: Request, pathname: string): Promise<Response> {
    // only a page has a twin. every other url falls through to the file itself
    if (wantsMarkdown(request)) {
        const twin = await env.ASSETS.fetch(at(request, assetPath(pathname, TWIN)));
        if (twin.status !== NOT_FOUND) return twin;
    }

    const direct = await env.ASSETS.fetch(request);
    if (direct.status !== NOT_FOUND) return direct;

    const generated = generatedPathFor(pathname);
    return generated === undefined ? direct : env.ASSETS.fetch(at(request, generated));
}

const handler = {
    async fetch(request: Request, env: Env): Promise<Response> {
        const { pathname } = new URL(request.url);
        const asset = await fromAssets(env, request, pathname);

        // collapse the slash/non-slash duplicate into one permanent redirect
        const normalized =
            asset.status === TRAILING_SLASH_REDIRECT && asset.headers.has('location')
                ? new Response(null, { status: PERMANENT_REDIRECT, headers: asset.headers })
                : asset;

        const response = new Response(normalized.body, normalized);

        const typed = TYPED_PATHS[pathname];
        if (typed !== undefined) response.headers.set('Content-Type', typed);

        const contentType = normalized.headers.get('content-type') ?? '';
        if (contentType.includes('text/html')) response.headers.set('Link', linkHeader(pathname));
        // a cache that ignores Accept would serve an agent the html
        if (contentType.includes('text/html') || contentType.includes(MARKDOWN)) {
            response.headers.set('Vary', 'Accept');
        }
        return response;
    }
};

export default handler;
