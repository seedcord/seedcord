import { embedding } from '@seedcord/docs-search';
import { Converters, Envapter } from 'envapt';

import { CloudflareApi, type HttpFetch } from '#src/lib/CloudflareApi';

// embeddinggemma's schema takes at most 100 texts a call
const BATCH = 100;

export class WorkersAi {
    private readonly api: CloudflareApi;

    // the token needs the Account > Workers AI permission
    static fromEnv(): WorkersAi {
        const read = (key: string): string => Envapter.getRequired(key, Converters.String);
        return new WorkersAi(read('CLOUDFLARE_ACCOUNT_ID'), read('CLOUDFLARE_API_TOKEN'));
    }

    constructor(
        private readonly accountId: string,
        token: string,
        http?: HttpFetch
    ) {
        this.api = new CloudflareApi(token, http);
    }

    async embed(texts: readonly string[]): Promise<number[][]> {
        const vectors: number[][] = [];
        for (let start = 0; start < texts.length; start += BATCH) {
            const batch = texts.slice(start, start + BATCH);
            const { data } = await this.api.post<{ data: number[][] }>(
                'embedding',
                `/accounts/${this.accountId}/ai/run/${embedding.model}`,
                { text: batch }
            );
            if (data.length !== batch.length) {
                throw new Error(`${embedding.model} returned ${data.length} vectors for ${batch.length} texts`);
            }
            vectors.push(...data);
        }
        return vectors;
    }
}
