import type { GuideSection } from '#src/guideSections';

interface EmbeddingResult {
    data: { embedding: number[] }[];
}

function isEmbeddingResult(result: unknown): result is EmbeddingResult {
    return (
        typeof result === 'object' &&
        result !== null &&
        'data' in result &&
        Array.isArray(result.data) &&
        result.data.every(
            (item: unknown) =>
                typeof item === 'object' &&
                item !== null &&
                'embedding' in item &&
                Array.isArray(item.embedding) &&
                item.embedding.every((value: unknown) => typeof value === 'number')
        )
    );
}

export const embedding = {
    model: '@cf/google/embeddinggemma-2',
    dimensions: 768,
    // embeddinggemma's model card needs these prefixes
    document: ({ page, heading, text }: GuideSection): string =>
        `title: ${heading === undefined ? page : `${page} > ${heading}`} | text: ${text}`,
    query: (question: string): string => `task: search result | query: ${question}`,
    request: (texts: readonly string[]): { input: string[] } => ({ input: [...texts] }),
    vectors(result: unknown, count: number): number[][] {
        if (!isEmbeddingResult(result)) {
            throw new Error(`${embedding.model} didn't return embeddings: ${JSON.stringify(result)}`);
        }
        if (result.data.length !== count) {
            throw new Error(`${embedding.model} returned ${result.data.length} vectors for ${count} texts`);
        }
        return result.data.map((item) => item.embedding);
    }
} as const;
