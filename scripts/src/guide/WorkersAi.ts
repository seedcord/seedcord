import { embedding } from '@seedcord/docs-search';
import { chunk } from 'es-toolkit';

import type { CloudflareApi } from '#src/lib/CloudflareApi';

// the model page doesn't state a batch limit. 100 texts a call works
const BATCH = 100;

export class WorkersAi {
    constructor(
        private readonly accountId: string,
        private readonly api: CloudflareApi
    ) {}

    async embed(texts: readonly string[]): Promise<number[][]> {
        const vectors: number[][] = [];
        for (const batch of chunk(texts, BATCH)) {
            const result = await this.api.post(
                'embedding',
                `/accounts/${this.accountId}/ai/run/${embedding.model}`,
                embedding.request(batch)
            );
            vectors.push(...embedding.vectors(result, batch.length));
        }
        return vectors;
    }
}
