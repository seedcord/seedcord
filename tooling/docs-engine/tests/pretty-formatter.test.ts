import { describe, expect, it } from 'vitest';

import { formatRenderedDeclarationHeaderPretty, formatRenderedSignaturePretty } from '@transformers/pretty-formatter';

import type { DocReference, InlineType, RenderedDeclarationHeader, RenderedSignature, SigPart } from '@src/types';

function ref(name: string): DocReference {
    return { name };
}

function inlineRef(name: string): InlineType {
    return { parts: [{ kind: 'ref', text: name, ref: ref(name) }] };
}

function inlineText(text: string): InlineType {
    return { parts: [{ kind: 'text', text }] };
}

function inlineMix(parts: SigPart[]): InlineType {
    return { parts };
}

const noResolver = (): null => null;
const idResolver = (r: DocReference): string => `/${r.name.toLowerCase()}`;

describe('formatRenderedSignaturePretty', () => {
    it('formats a single-line signature that fits in 80 columns', async () => {
        const render: RenderedSignature = {
            name: [{ kind: 'text', text: 'foo' }],
            parameters: [{ name: 'x', optional: false, type: inlineText('number') }],
            returnType: inlineText('string')
        };

        const result = await formatRenderedSignaturePretty(render, noResolver);

        expect(result.text).toBe('foo(x: number): string');
        expect(result.refs).toHaveLength(0);
    });

    it('wraps long signatures and tracks ref offsets', async () => {
        const render: RenderedSignature = {
            name: [{ kind: 'text', text: 'EventMiddleware' }],
            typeParams: [
                {
                    name: 'TPluggableEvents',
                    constraint: inlineRef('SEEventMapLike'),
                    default: inlineRef('SENoEvents')
                }
            ],
            parameters: [
                { name: 'shutdown', optional: false, type: inlineRef('CoordinatedShutdown') },
                { name: 'startup', optional: false, type: inlineRef('CoordinatedStartup') }
            ],
            returnType: inlineRef('Pluggable')
        };

        const result = await formatRenderedSignaturePretty(render, idResolver);

        expect(result.text).toContain('\n');
        expect(result.text).not.toContain('__seedcordRef');
        expect(result.refs.length).toBeGreaterThan(0);

        for (const r of result.refs) {
            expect(result.text.slice(r.start, r.end)).toBe(r.name);
        }
        expect(result.refs.map((r) => r.name)).toContain('SEEventMapLike');
        expect(result.refs.map((r) => r.name)).toContain('CoordinatedShutdown');
        expect(result.refs.map((r) => r.name)).toContain('Pluggable');

        const seRef = result.refs.find((r) => r.name === 'SEEventMapLike');
        expect(seRef?.href).toBe('/seeventmaplike');
    });

    it('emits refs with null href when resolver returns null', async () => {
        const render: RenderedSignature = {
            name: [{ kind: 'text', text: 'foo' }],
            parameters: [{ name: 'x', optional: false, type: inlineRef('Bar') }]
        };

        const result = await formatRenderedSignaturePretty(render, noResolver);

        expect(result.text).toContain('x: Bar');
        expect(result.refs).toHaveLength(1);
        expect(result.refs[0]?.name).toBe('Bar');
        expect(result.refs[0]?.href).toBeNull();
        expect(result.text.slice(result.refs[0]!.start, result.refs[0]!.end)).toBe('Bar');
    });

    it('handles parameter default values with literal braces', async () => {
        const render: RenderedSignature = {
            name: [{ kind: 'text', text: 'foo' }],
            parameters: [
                {
                    name: 'opts',
                    optional: false,
                    type: inlineText('{ x: number }'),
                    defaultValue: '{ x: 1 }'
                }
            ],
            returnType: inlineText('void')
        };

        const result = await formatRenderedSignaturePretty(render, noResolver);

        expect(result.text).toContain('opts: { x: number }');
        expect(result.text).toContain('= { x: 1 }');
        expect(result.text).not.toContain('function _');
        expect(result.text).not.toContain('class _');
    });

    it('records every occurrence of a repeated reference', async () => {
        const shared = ref('SharedType');
        const render: RenderedSignature = {
            name: [{ kind: 'text', text: 'foo' }],
            parameters: [
                {
                    name: 'a',
                    optional: false,
                    type: inlineMix([{ kind: 'ref', text: 'SharedType', ref: shared }])
                },
                {
                    name: 'b',
                    optional: false,
                    type: inlineMix([{ kind: 'ref', text: 'SharedType', ref: shared }])
                }
            ]
        };

        const result = await formatRenderedSignaturePretty(render, idResolver);

        const sharedRefs = result.refs.filter((r) => r.name === 'SharedType');
        expect(sharedRefs).toHaveLength(2);
        for (const r of sharedRefs) {
            expect(result.text.slice(r.start, r.end)).toBe('SharedType');
        }
        expect(sharedRefs[0]?.start).not.toBe(sharedRefs[1]?.start);
    });
});

describe('formatRenderedDeclarationHeaderPretty', () => {
    it('formats a bare class header', async () => {
        const header: RenderedDeclarationHeader = {
            name: 'Foo',
            modifiers: [],
            keyword: 'class'
        };

        const result = await formatRenderedDeclarationHeaderPretty(header, noResolver);

        expect(result.text).toBe('class Foo');
        expect(result.refs).toHaveLength(0);
    });

    it('formats an interface header with multiple extends and tracks ref offsets', async () => {
        const header: RenderedDeclarationHeader = {
            name: 'ChannelConfig',
            modifiers: [],
            keyword: 'interface',
            heritage: { extends: [inlineRef('BaseConfig'), inlineRef('Loggable')] }
        };

        const result = await formatRenderedDeclarationHeaderPretty(header, idResolver);

        expect(result.text).toContain('interface ChannelConfig');
        expect(result.text).toContain('extends BaseConfig, Loggable');
        expect(result.text).not.toMatch(/\{\s*\}\s*$/);

        const base = result.refs.find((r) => r.name === 'BaseConfig');
        const logg = result.refs.find((r) => r.name === 'Loggable');
        expect(base?.href).toBe('/baseconfig');
        expect(logg?.href).toBe('/loggable');
        expect(result.text.slice(base!.start, base!.end)).toBe('BaseConfig');
        expect(result.text.slice(logg!.start, logg!.end)).toBe('Loggable');
    });

    it('formats a type alias with conditional RHS', async () => {
        const header: RenderedDeclarationHeader = {
            name: 'AwaitedOr',
            modifiers: [],
            keyword: 'type',
            typeParams: [{ name: 'T' }],
            value: inlineText('T extends Promise<infer U> ? U : T')
        };

        const result = await formatRenderedDeclarationHeaderPretty(header, noResolver);

        expect(result.text).toContain('type AwaitedOr<T>');
        expect(result.text).toContain('T extends Promise<infer U> ? U : T');
    });

    it('formats a property-shape header (no keyword) with modifiers + type', async () => {
        const header: RenderedDeclarationHeader = {
            name: 'plugins',
            modifiers: ['protected', 'readonly'],
            keyword: null,
            type: inlineMix([
                { kind: 'ref', text: 'Plugin', ref: ref('Plugin') },
                { kind: 'punct', text: '<' },
                { kind: 'ref', text: 'SENoEvents', ref: ref('SENoEvents') },
                { kind: 'punct', text: '>[]' }
            ])
        };

        const result = await formatRenderedDeclarationHeaderPretty(header, idResolver);

        expect(result.text).toContain('protected readonly plugins:');
        expect(result.text).toContain('Plugin<SENoEvents>[]');
        const plugin = result.refs.find((r) => r.name === 'Plugin');
        const ev = result.refs.find((r) => r.name === 'SENoEvents');
        expect(plugin?.href).toBe('/plugin');
        expect(ev?.href).toBe('/senoevents');
        expect(result.text.slice(plugin!.start, plugin!.end)).toBe('Plugin');
        expect(result.text.slice(ev!.start, ev!.end)).toBe('SENoEvents');
    });
});
