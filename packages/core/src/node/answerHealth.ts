const HTTP_OK = 200;
const HTTP_SERVICE_UNAVAILABLE = 503;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function answerHealth(request: Request, path: string, ready: boolean): Response | undefined {
    if (request.method !== 'GET' || new URL(request.url).pathname !== path) return undefined;
    if (!ready) return new Response(null, { status: HTTP_SERVICE_UNAVAILABLE });
    return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        status: HTTP_OK,
        headers: JSON_HEADERS
    });
}
