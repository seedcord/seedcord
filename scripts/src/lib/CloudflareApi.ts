const CF_API = 'https://api.cloudflare.com/client/v4';

interface HttpResponse {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
}

export type HttpFetch = (
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<HttpResponse>;

export class CloudflareApi {
    constructor(
        private readonly token: string,
        private readonly http: HttpFetch = fetch
    ) {}

    async post(label: string, path: string, body: unknown): Promise<unknown> {
        const response = await this.http(`${CF_API}${path}`, {
            method: 'POST',
            headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
            body: JSON.stringify(body)
        });

        // cloudflare v4 puts the payload under result, beside success and errors
        const payload = (await response.json()) as { success?: boolean; result?: unknown; errors?: unknown[] };
        if (!response.ok || payload.success !== true || payload.result === undefined) {
            throw new Error(`Cloudflare ${label} failed (HTTP ${response.status}): ${JSON.stringify(payload.errors)}`);
        }
        return payload.result;
    }
}
