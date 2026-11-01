import { embedding } from '#src/embedding';
import { GUIDE_SECTIONS_PATH, GUIDE_VECTORS_PATH } from '#src/files';
import { guideHit } from '#src/guideSections';

import type { GuideHit, GuideSection } from '#src/guideSections';

type ReadAsset = (path: string) => Promise<Response>;

const VERSION_CHARS = 16;
const HEX = 16;

async function read(asset: ReadAsset, path: string): Promise<Response> {
    const response = await asset(path);
    if (!response.ok) throw new Error(`${path} failed to load with status ${response.status}`);
    return response;
}

async function versionOf(...files: (string | ArrayBuffer)[]): Promise<string> {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await new Blob(files).arrayBuffer()));
    return Array.from(digest, (byte) => byte.toString(HEX).padStart(2, '0'))
        .join('')
        .slice(0, VERSION_CHARS);
}

interface Row {
    section: GuideSection;
    vector: Float32Array;
    length: number;
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
            return { section, vector, length: Math.hypot(...vector) };
        });
    }

    static async load(asset: ReadAsset): Promise<SectionIndex> {
        const [sectionsFile, vectorsFile] = await Promise.all([
            read(asset, GUIDE_SECTIONS_PATH),
            read(asset, GUIDE_VECTORS_PATH)
        ]);
        const text = await sectionsFile.text();
        const buffer = await vectorsFile.arrayBuffer();
        // the guide build writes this file from the same type
        const sections = JSON.parse(text) as GuideSection[];

        const vectors = new Float32Array(buffer);
        const count = vectors.length / embedding.dimensions;
        if (count !== sections.length) {
            throw new Error(`${GUIDE_VECTORS_PATH} holds ${count} vectors for ${sections.length} sections`);
        }
        return new SectionIndex(sections, vectors, await versionOf(text, buffer));
    }

    rank(question: readonly number[], limit: number): GuideHit[] {
        if (question.length !== embedding.dimensions) {
            throw new Error(
                `A question vector has ${question.length} values. ${embedding.model} makes ${embedding.dimensions}.`
            );
        }
        const questionLength = Math.hypot(...question);
        return this.rows
            .map(({ section, vector, length }) => {
                const dot = vector.reduce((sum, value, d) => sum + value * (question[d] ?? 0), 0);
                return { section, score: dot / (length * questionLength) };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ section }) => guideHit(section));
    }
}
