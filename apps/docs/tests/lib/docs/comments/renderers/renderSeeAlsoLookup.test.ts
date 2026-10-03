import { DocKind } from '@seedcord/docs-engine/client';
import { describe, expect, it } from 'vitest';

import { renderSeeAlso } from '#lib/docs/comments/renderers/renderSeeAlso';

import { docNode, fixtureEngine } from '../../../../fixtures/docsEngine';

import type { DocComment } from '@seedcord/docs-engine';

// api extractor leaves many in-repo `@see {@link X}` destinations unresolved
const SEE_BUS: DocComment = {
    summary: '',
    summaryParts: [],
    blockTags: [{ tag: '@see', text: 'Bus', content: [] }],
    modifierTags: [],
    examples: []
};

describe('a @see with neither href nor target', () => {
    it('links the symbol it finds by name', async () => {
        const engine = fixtureEngine('core', '@seedcord/core', [
            { version: '0.9.2', nodes: (pkg) => [docNode(pkg, 'Bus', { kind: DocKind.Class })] }
        ]);
        await engine.setVersion('core', '0.9.2');

        expect(renderSeeAlso(SEE_BUS, { engine, manifestPackage: '@seedcord/core' })).toEqual([
            { name: 'Bus', href: '/docs/packages/core/0.9.2/classes/bus' }
        ]);
    });
});
