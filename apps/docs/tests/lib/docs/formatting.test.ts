import { describe, expect, it } from 'vitest';

import { formatSignature } from '@lib/docs/formatting';

import type { FormatContext } from '@lib/docs/types';
import type { RenderedSignature } from '@seedcord/docs-engine';

// A stub engine is enough: refs carrying only a `name` fall through to resolveExternalPackageUrl,
// which links intrinsics/globals (string, Promise) without any loaded package.
// justified: the formatting path only calls engine.resolveReference, which we stub to "unresolved".
const context = (): FormatContext =>
    ({ engine: { resolveReference: () => ({}) }, manifestPackage: 'mock' }) as unknown as FormatContext;

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
        // (shiki nests the identifier in a <span>, so assert the woven href, not `>name</a>`).
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
