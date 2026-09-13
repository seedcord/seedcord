const CF_API = 'https://api.cloudflare.com/client/v4';

type PurgeBody = { purge_everything: true } | { files: string[] } | { prefixes: string[] };

interface HttpResponse {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
}

type HttpFetch = (
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<HttpResponse>;

export class CdnPurge {
    static bodyFor(targets: { prefixes: string[]; files: string[] }): PurgeBody {
        if (targets.prefixes.length > 0) return { prefixes: targets.prefixes };
        if (targets.files.length > 0) return { files: targets.files };

        return { purge_everything: true };
    }

    constructor(
        private readonly zoneId: string,
        private readonly token: string,
        private readonly http: HttpFetch = fetch
    ) {}

    async purge(body: PurgeBody): Promise<void> {
        const response = await this.http(`${CF_API}/zones/${this.zoneId}/purge_cache`, {
            method: 'POST',
            headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
            body: JSON.stringify(body)
        });

        // justified: cloudflare's purge endpoint returns untyped JSON
        const result = (await response.json()) as { success?: boolean; errors?: unknown[] };
        if (!response.ok || result.success !== true) {
            throw new Error(`Cloudflare purge failed (HTTP ${response.status}): ${JSON.stringify(result.errors)}`);
        }
    }
}
