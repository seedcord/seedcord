import { agentLinkHeader } from '@seedcord/ui/agents';
import { fetchAsset, type Assets } from '@seedcord/ui/fetchAsset';

interface Env {
    ASSETS: Assets;
}

// every other host serves the same content, so it gets an X-Robots-Tag noindex to keep duplicates out of Google
const PRODUCTION_HOST = 'seedcord.org';
const WWW_HOST = `www.${PRODUCTION_HOST}`;

const MOVED_PERMANENTLY = 301;

const LINK_HEADER = agentLinkHeader('home');

// cloudflare serves the extension-less file next writes here without a content-type
const ICON_PATH = '/icon';

const handler = {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        if (url.hostname === WWW_HOST) {
            url.hostname = PRODUCTION_HOST;
            return Response.redirect(url.toString(), MOVED_PERMANENTLY);
        }

        const asset = await fetchAsset(env.ASSETS, request);

        const isHtml = (asset.headers.get('content-type') ?? '').includes('text/html');
        const isProduction = url.hostname === PRODUCTION_HOST;
        const isIcon = url.pathname === ICON_PATH;

        if (isProduction && !isHtml && !isIcon) return asset;

        const response = new Response(asset.body, asset);
        if (isIcon) response.headers.set('Content-Type', 'image/png');
        if (isHtml) response.headers.set('Link', LINK_HEADER);
        if (!isProduction) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return response;
    }
};

export default handler;
