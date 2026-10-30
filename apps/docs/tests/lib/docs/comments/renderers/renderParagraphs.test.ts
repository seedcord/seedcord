import { describe, expect, it } from 'vite-plus/test';

import { renderParagraphs } from '#lib/docs/comments/renderers/renderParagraphs';

import type { CommentDisplayPart, FormatContext } from '#lib/docs/types';
import type { DocComment, VersionedDocsEngine } from '@seedcord/docs-engine';

function summaryOf(summaryParts: CommentDisplayPart[]): DocComment {
    return { summary: '', summaryParts, blockTags: [], modifierTags: [], examples: [] };
}

// justified: only a link part reads the engine
const context: FormatContext = { engine: {} as unknown as VersionedDocsEngine, manifestPackage: 'seedcord' };

describe('renderParagraphs', () => {
    it('renders a fenced block as a code block', async () => {
        const [paragraph] = await renderParagraphs(
            summaryOf([
                { kind: 'text', text: 'Reads a wire.\n\n' },
                { kind: 'fence', language: 'ts', text: 'const a = 1;\nconst b = 2;\n' }
            ]),
            context
        );

        expect(paragraph?.plain).toContain('```ts\nconst a = 1;\nconst b = 2;\n```');
        expect(paragraph?.html).toContain('<pre');
    });
});
