import { describe, expect, it } from 'vite-plus/test';

import { embedding } from '#src/embedding';
import { GUIDE_SECTIONS_PATH, GUIDE_VECTORS_PATH } from '#src/files';
import { SectionIndex } from '#src/SectionIndex';

import type { GuideSection } from '#src/guideSections';

const SECTIONS: GuideSection[] = [
    { path: '/components/buttons', tab: 'Components', page: 'Buttons', text: 'button text' },
    {
        path: '/checks/cooldown#the-duration',
        tab: 'Checks',
        page: 'Cooldowns',
        heading: 'The duration',
        text: 'cooldown text'
    },
    {
        path: '/plugins/lifecycle#timeouts',
        tab: 'Writing plugins',
        page: 'The lifecycle',
        heading: 'Timeouts',
        text: 'timeout text'
    }
];

function zeroPadded(...front: number[]): number[] {
    return [...front, ...new Array<number>(embedding.dimensions - front.length).fill(0)];
}

// different lengths on purpose. the test fails if rank stops dividing by each vector's length
const VECTORS = [zeroPadded(3, 0), zeroPadded(0, 5), zeroPadded(1, 1)];

function assets(sections: unknown, vectors: number[][]): (path: string) => Promise<Response> {
    const files: Record<string, () => Response> = {
        [GUIDE_SECTIONS_PATH]: () => Response.json(sections),
        [GUIDE_VECTORS_PATH]: () => new Response(new Float32Array(vectors.flat()).buffer)
    };
    return (path) => Promise.resolve(files[path]?.() ?? new Response(null, { status: 404 }));
}

describe('SectionIndex', () => {
    it('ranks sections by how close their vector points to the question', async () => {
        const index = await SectionIndex.load(assets(SECTIONS, VECTORS));

        expect(index.rank(zeroPadded(0.1, 2), 2)).toEqual([
            { path: '/checks/cooldown#the-duration', tab: 'Checks', page: 'Cooldowns', heading: 'The duration' },
            { path: '/plugins/lifecycle#timeouts', tab: 'Writing plugins', page: 'The lifecycle', heading: 'Timeouts' }
        ]);
    });

    it('leaves out sections that barely relate to the question', async () => {
        const index = await SectionIndex.load(assets(SECTIONS, VECTORS));

        expect(index.rank(zeroPadded(0, 0, 1), 3)).toEqual([]);
    });

    it('throws for a question vector of the wrong size', async () => {
        const index = await SectionIndex.load(assets(SECTIONS, VECTORS));

        expect(() => index.rank([0.1, 2], 2)).toThrow(/2 values.*768/);
    });

    it('changes the version when either file changes', async () => {
        const first = await SectionIndex.load(assets(SECTIONS, VECTORS));
        const again = await SectionIndex.load(assets(SECTIONS, VECTORS));
        const newVectors = await SectionIndex.load(assets(SECTIONS, [zeroPadded(1, 0), ...VECTORS.slice(1)]));
        const moved = SECTIONS.map((section, index) => (index === 0 ? { ...section, path: '/moved' } : section));
        const newSections = await SectionIndex.load(assets(moved, VECTORS));

        expect(again.version).toBe(first.version);
        expect(newVectors.version).not.toBe(first.version);
        expect(newSections.version).not.toBe(first.version);
    });

    it('throws when the vectors were built for a different section list', async () => {
        await expect(SectionIndex.load(assets(SECTIONS.slice(1), VECTORS))).rejects.toThrow(/3 vectors.*2 sections/);
    });

    it('throws with the status when a file is missing', async () => {
        const missing = (): Promise<Response> => Promise.resolve(new Response(null, { status: 404 }));
        await expect(SectionIndex.load(missing)).rejects.toThrow(/404/);
    });
});
