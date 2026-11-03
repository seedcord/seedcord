export interface Assets {
    fetch(request: Request): Promise<Response>;
}

const TEMPORARY_REDIRECT = 307;
const PERMANENT_REDIRECT = 308;

function samePath(a: URL, b: URL): boolean {
    try {
        return decodeURIComponent(a.pathname) === decodeURIComponent(b.pathname);
    } catch {
        return false;
    }
}

export async function fetchAsset(assets: Assets, request: Request): Promise<Response> {
    const response = await assets.fetch(request);
    const location = response.headers.get('location');
    if (response.status !== TEMPORARY_REDIRECT || location === null) return response;

    const target = new URL(location, request.url);
    // cloudflare's asset server answers a raw $, like the one in next's prefetch file names, with a 307 to %24
    if (samePath(target, new URL(request.url))) return assets.fetch(new Request(target, request));

    // the other 307 is html_handling moving the trailing slash
    return new Response(null, { status: PERMANENT_REDIRECT, headers: response.headers });
}
