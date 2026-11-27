const VITE_CLIENT = '<script type="module" src="/@vite/client"></script>';
// html may leave out both closing tags, and a module script runs from anywhere in the page
const CLOSING_TAG = /<\/head>|<\/body>/i;

// vite's client in a plugin's html reloads the tab when you save a file under seedcord dev
export async function finishPage(response: Response): Promise<Response> {
    const { headers: sent } = response;
    // a compressed body would get the script spliced into its compressed bytes
    const isPage = sent.get('content-type')?.startsWith('text/html') === true && !sent.has('content-encoding');
    // new Response() throws when it gets a body with a 204 or a 304
    if (!isPage || response.body === null) return response;

    const html = await response.text();
    const at = CLOSING_TAG.exec(html)?.index ?? html.length;
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    const body = html.slice(0, at) + VITE_CLIENT + html.slice(at);
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
