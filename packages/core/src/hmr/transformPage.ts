const VITE_CLIENT = '<script type="module" src="/@vite/client"></script>';
// html can leave out both closing tags. a module script runs from anywhere in the page
const CLOSING_TAG = /<\/head>|<\/body>/i;

// under seedcord dev, vite puts a small script in every page in client/. that script reloads the tab when you save a file.
// html that a plugin returns from fetch() gets the script here because vite never reads it
export async function transformPage(
    response: Response,
    transform: (html: string) => Promise<string> | string
): Promise<Response> {
    const { headers: sent } = response;
    // splicing the script into a compressed body would corrupt it
    const isPage = sent.get('content-type')?.startsWith('text/html') === true && !sent.has('content-encoding');
    // new Response() throws when it gets a body with a 204 or a 304
    if (!isPage || response.body === null) return response;

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    const body = await transform(await response.text());
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

// the edge adds the script by hand because workerd runs apart from the vite server. vite plugins' html hooks never get this html
export function addViteClient(html: string): string {
    const at = CLOSING_TAG.exec(html)?.index ?? html.length;
    return html.slice(0, at) + VITE_CLIENT + html.slice(at);
}
