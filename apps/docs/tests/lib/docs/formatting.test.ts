import { AnchorStrategy, ReferenceResolver } from '@seedcord/docs-engine';
import { describe, expect, it } from 'vitest';

import { formatSignature } from '@lib/docs/formatting';

import type { FormatContext } from '@lib/docs/types';
import type { NodeLookup, PackageRegistry, RenderedSignature } from '@seedcord/docs-engine';

// An empty lookup makes resolve() fall through to the external-URL table, so name-only refs
// (string, Promise) link to MDN, matching the engine's behavior with no loaded package.
const emptyLookup: NodeLookup = {
    getNodeByKey: () => null,
    getNodeBySlug: () => null,
    getNodeByGlobalSlug: () => null,
    getNodeByQualifiedName: () => null,
    getPackage: () => null
};
const emptyRegistry: PackageRegistry = {
    isKnownPackage: () => false,
    candidatePackages: (current) => [current],
    crossPackageEntity: () => null
};
const resolver = new ReferenceResolver(emptyLookup, emptyRegistry, new AnchorStrategy(emptyLookup));

// justified: the formatting path only calls engine.resolver(); stub returns the empty-lookup resolver.
const context = (): FormatContext =>
    ({ engine: { resolver: () => resolver }, manifestPackage: 'mock' }) as unknown as FormatContext;

const EMPTY_ANCHOR = /<a\b[^>]*><\/a>/;

const ref = (text: string): { kind: 'ref'; text: string; ref: { name: string } } => ({
    kind: 'ref',
    text,
    ref: { name: text }
});

describe('formatSignature link weaving', () => {
    it('keeps type links when a modifier prefix is applied (regression: prefix dropped links)', async () => {
        const render: RenderedSignature = {
            name: [{ kind: 'text', text: 'fetchThing' }],
            parameters: [{ name: 'id', optional: false, type: { parts: [ref('string')] } }],
            returnType: { parts: [ref('Promise')] }
        };

        const out = await formatSignature(render, context(), 'public async');

        expect(out.text.startsWith('public async ')).toBe(true);
        // string -> MDN String, Promise -> MDN Promise: both must survive the prefix path
        // (shiki nests the identifier in a <span>, so assert the inserted href, not `>name</a>`).
        expect(out.html).toContain('Reference/Global_Objects/String');
        expect(out.html).toContain('Reference/Global_Objects/Promise');
        expect(EMPTY_ANCHOR.test(out.html ?? '')).toBe(false);
    });

    it('weaves links without a prefix too', async () => {
        const render: RenderedSignature = {
            name: [{ kind: 'text', text: 'f' }],
            parameters: [{ name: 'id', optional: false, type: { parts: [ref('string')] } }]
        };

        const out = await formatSignature(render, context());

        expect(out.html).toContain('Reference/Global_Objects/String');
        expect(EMPTY_ANCHOR.test(out.html ?? '')).toBe(false);
    });

    it('opens external type links in a new tab via the CodeLink.external flag', async () => {
        // `string` resolves to an MDN URL (external https), so refsToLinks marks it external and
        // applyLinkMarkers adds target="_blank".
        const render: RenderedSignature = {
            name: [{ kind: 'text', text: 'f' }],
            parameters: [{ name: 'id', optional: false, type: { parts: [ref('string')] } }]
        };

        const out = await formatSignature(render, context());

        expect(out.html).toContain('target="_blank"');
    });

    it('drops the empty seam anchors DOMPurify leaves on a span-crossing link', async () => {
        // `id: string` places the link right after `: `, which shiki tokenizes across a span seam;
        // before the fix DOMPurify split that into an empty <a></a> plus the real anchor.
        const render: RenderedSignature = {
            name: [{ kind: 'text', text: 'compute' }],
            parameters: [
                { name: 'first', optional: false, type: { parts: [ref('string')] } },
                { name: 'second', optional: false, type: { parts: [ref('Promise')] } }
            ],
            returnType: { parts: [ref('boolean')] }
        };

        const out = await formatSignature(render, context(), 'public');

        expect(EMPTY_ANCHOR.test(out.html ?? '')).toBe(false);
        expect(out.html).toContain('Reference/Global_Objects/String');
        expect(out.html).toContain('Reference/Global_Objects/Boolean');
    });
});
