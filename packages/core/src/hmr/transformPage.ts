const VITE_CLIENT = '<script type="module" src="/@vite/client"></script>';

// adds vite's reload script to a plugin's fetch() html because vite never reads that html
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

// the edge adds the script by hand because workerd runs apart from the vite server
export function addViteClient(html: string): string {
    return html + VITE_CLIENT;
}
