import type { CloudflareApi } from '#src/lib/CloudflareApi';

type PurgeBody = { purge_everything: true } | { files: string[] } | { prefixes: string[] };

export class CdnPurge {
    static bodyFor(targets: { prefixes: string[]; files: string[] }): PurgeBody {
        if (targets.prefixes.length > 0) return { prefixes: targets.prefixes };
        if (targets.files.length > 0) return { files: targets.files };

        return { purge_everything: true };
    }

    constructor(
        private readonly zoneId: string,
        private readonly api: CloudflareApi
    ) {}

    async purge(body: PurgeBody): Promise<void> {
        await this.api.post('purge', `/zones/${this.zoneId}/purge_cache`, body);
    }
}
