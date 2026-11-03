import { embedding } from '#src/embedding';
import { GUIDE_SECTIONS_PATH, GUIDE_VECTORS_PATH } from '#src/files';
import { guideHit } from '#src/guideSections';
import { readAsset, readJson } from '#src/readAsset';

import type { GuideHit, GuideSection } from '#src/guideSections';
import type { ReadAsset } from '#src/readAsset';

const VERSION_CHARS = 16;
const HEX = 16;

// this kinda messes up in weird places: "list 50 items" scores 0.28 and "zzzzz" 0.27
// but a weak result for junk costs less than nothing for a real question so its fine
const MIN_SCORE = 0.25;

async function versionOf(...files: (string | ArrayBuffer)[]): Promise<string> {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await new Blob(files).arrayBuffer()));
    return Array.from(digest, (byte) => byte.toString(HEX).padStart(2, '0'))
        .join('')
        .slice(0, VERSION_CHARS);
}

interface Row {
    section: GuideSection;
    vector: Float32Array;
    norm: number;
}

export class SectionIndex {
    private readonly rows: Row[];

    private constructor(
        sections: readonly GuideSection[],
        vectors: Float32Array,
        readonly version: string
    ) {
        this.rows = sections.map((section, index) => {
            const vector = vectors.subarray(index * embedding.dimensions, (index + 1) * embedding.dimensions);
            return { section, vector, norm: Math.hypot(...vector) };
        });
    }

    static async load(read: ReadAsset): Promise<SectionIndex> {
        const [sections, buffer] = await Promise.all([
            readJson<GuideSection[]>(GUIDE_SECTIONS_PATH, read),
            readAsset(GUIDE_VECTORS_PATH, read).then((file) => file.arrayBuffer())
        ]);

        const vectors = new Float32Array(buffer);
        const count = vectors.length / embedding.dimensions;
        if (count !== sections.length) {
            throw new Error(
                `${GUIDE_VECTORS_PATH} holds ${count} vectors for ${sections.length} sections. Run pnpm guide:embed after building the guide.`
            );
        }
        return new SectionIndex(sections, vectors, await versionOf(JSON.stringify(sections), buffer));
    }

    rank(question: readonly number[], limit: number): GuideHit[] {
        if (question.length !== embedding.dimensions) {
            throw new Error(
                `A question vector has ${question.length} values. ${embedding.model} makes ${embedding.dimensions}.`
            );
        }
        const questionNorm = Math.hypot(...question);
        return this.rows
            .map(({ section, vector, norm }) => {
                const dot = vector.reduce((sum, value, d) => sum + value * (question[d] ?? 0), 0);
                return { section, score: dot / (norm * questionNorm) };
            })
            .filter(({ score }) => score >= MIN_SCORE)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ section }) => guideHit(section));
    }
}
