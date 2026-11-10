import { embedding } from '@seedcord/docs-search';
import { chunk } from 'es-toolkit';

import type { CloudflareApi } from '#src/lib/CloudflareApi';

// embeddinggemma's schema takes at most 100 texts a call
const BATCH = 100;

function isEmbeddings(result: unknown): result is { data: number[][] } {
    return (
        typeof result === 'object' &&
        result !== null &&
        'data' in result &&
        Array.isArray(result.data) &&
        result.data.every((vector) => Array.isArray(vector) && vector.every((value) => typeof value === 'number'))
    );
}

export class WorkersAi {
    constructor(
        private readonly accountId: string,
        private readonly api: CloudflareApi
    ) {}

    async embed(texts: readonly string[]): Promise<number[][]> {
        const vectors: number[][] = [];
        for (const batch of chunk(texts, BATCH)) {
            const result = await this.api.post('embedding', `/accounts/${this.accountId}/ai/run/${embedding.model}`, {
                text: batch
            });
            if (!isEmbeddings(result)) {
                throw new Error(`${embedding.model} didn't return embeddings: ${JSON.stringify(result)}`);
            }
            const { data } = result;
            if (data.length !== batch.length) {
                throw new Error(`${embedding.model} returned ${data.length} vectors for ${batch.length} texts`);
            }
            vectors.push(...data);
        }
        return vectors;
    }
}
