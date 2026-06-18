import { describe, expect, it } from 'vitest';

import { renderDefaultValue } from '@lib/docs/comments/renderers/renderDefaultValue';

import type { FormatContext } from '@lib/docs/types';
import type { DocComment, DocCommentBlockTag, VersionedDocsEngine } from '@seedcord/docs-engine';

type DisplayPart = { kind: 'text'; text: string } | { kind: 'code'; text: string };

function makeTag(tag: string, content: DisplayPart[]): DocCommentBlockTag {
    return { tag, text: '', content };
}

function makeComment(blockTags: DocCommentBlockTag[]): DocComment {
    return { summary: '', summaryParts: [], blockTags, modifierTags: [], examples: [] };
}

function makeContext(): FormatContext {
    return { engine: {} as unknown as VersionedDocsEngine, manifestPackage: 'seedcord' };
}

describe('renderDefaultValue', () => {
    it('returns undefined when no @defaultValue tag is present', async () => {
        await expect(renderDefaultValue(makeComment([]), makeContext())).resolves.toBeUndefined();
    });

    it('returns undefined when block tags contain no @defaultValue entry', async () => {
        const comment = makeComment([makeTag('@throws', [{ kind: 'text', text: 'boom' }])]);
        await expect(renderDefaultValue(comment, makeContext())).resolves.toBeUndefined();
    });

    it('renders the @defaultValue content inline (no block paragraph wrapper)', async () => {
        const comment = makeComment([makeTag('@defaultValue', [{ kind: 'code', text: 'true' }])]);
        const result = await renderDefaultValue(comment, makeContext());
        expect(result).toHaveLength(1);
        expect(result?.[0]?.plain).toContain('true');
        expect(result?.[0]?.html).not.toContain('<p>');
    });
});
