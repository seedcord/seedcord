import { CloudflareApi, type HttpFetch } from '#src/lib/CloudflareApi';

type PurgeBody = { purge_everything: true } | { files: string[] } | { prefixes: string[] };

export class CdnPurge {
    private readonly api: CloudflareApi;

    static bodyFor(targets: { prefixes: string[]; files: string[] }): PurgeBody {
        if (targets.prefixes.length > 0) return { prefixes: targets.prefixes };
        if (targets.files.length > 0) return { files: targets.files };

        return { purge_everything: true };
    }

    constructor(
        private readonly zoneId: string,
        token: string,
        http?: HttpFetch
    ) {
        this.api = new CloudflareApi(token, http);
    }

    async purge(body: PurgeBody): Promise<void> {
        await this.api.post('purge', `/zones/${this.zoneId}/purge_cache`, body);
    }
}
