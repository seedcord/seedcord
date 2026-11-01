import { PRODUCTION_ORIGIN } from '@seedcord/brand';
import { GUIDE_ASK_PATH } from '@seedcord/docs-search';
import { agentLinkHeader } from '@seedcord/ui/agents';
import { fetchAsset } from '@seedcord/ui/fetchAsset';
import { PageAsset, TWIN } from '@seedcord/ui/PageAsset';
import { GUIDE } from '@seedcord/ui/sites';

import { ask, type GuideEnv, type WorkerContext } from './src/lib/ask';
import { redirectFor } from './src/lib/redirects';

const PERMANENT_REDIRECT = 308;
const NOT_FOUND = 404;

const PRODUCTION_HOST = new URL(PRODUCTION_ORIGIN).hostname;

const MARKDOWN = 'text/markdown';
const HTML = 'text/html';

// cloudflare serves the extension-less files next writes here with no content-type at all
const TYPED_PATHS: Record<string, string> = {
    '/icon': 'image/png',
    '/apple-icon': 'image/png'
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
async function fromAssets(env: GuideEnv, request: Request, page: string): Promise<Response> {
    // only a page has a twin. every other url falls through to the file itself
    if (wantsMarkdown(request)) {
        const twin = await env.ASSETS.fetch(at(request, GUIDE.path + TWIN.exportPath(page)));
        if (twin.status !== NOT_FOUND) return twin;
    }

    const direct = await fetchAsset(env.ASSETS, request);
    if (direct.status !== NOT_FOUND) return direct;

    const generated = PageAsset.forPath(page)?.exportPath(page);
    return generated === undefined ? direct : env.ASSETS.fetch(at(request, GUIDE.path + generated));
}

const handler = {
    async fetch(request: Request, env: GuideEnv, context: WorkerContext): Promise<Response> {
        const { hostname, pathname } = new URL(request.url);
        // the zone routes only /guide and /guide/* here
        const page = pathname.slice(GUIDE.path.length) || '/';
        if (page === GUIDE_ASK_PATH) return ask(request, env, context);

        const moved = redirectFor(page);
        if (moved !== undefined)
            return new Response(null, { status: PERMANENT_REDIRECT, headers: { location: GUIDE.path + moved } });

        const asset = await fromAssets(env, request, page);
        const response = new Response(asset.body, asset);

        const typed = TYPED_PATHS[page];
        if (typed !== undefined) response.headers.set('Content-Type', typed);

        const contentType = asset.headers.get('content-type') ?? '';
        if (contentType.includes('text/html')) {
            response.headers.set('Link', agentLinkHeader('guide', GUIDE.path + TWIN.publicPath(page)));
        }
        // a cache that ignores Accept would serve an agent the html
        if (contentType.includes('text/html') || contentType.includes(MARKDOWN)) {
            response.headers.set('Vary', 'Accept');
        }
        if (hostname !== PRODUCTION_HOST) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return response;
    }
};

export default handler;
