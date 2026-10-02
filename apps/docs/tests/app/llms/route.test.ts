import { describe, expect, it, vi } from 'vitest';

const { resolveEntityMock } = vi.hoisted(() => ({ resolveEntityMock: vi.fn() }));

vi.mock('#lib/site', () => ({ canonicalUrl: (path: string) => `https://docs.seedcord.org${path}` }));
vi.mock('#lib/docs/catalog', () => ({ findPackageVersion: vi.fn() }));
vi.mock('#lib/docs/resolveEntity', () => ({ resolveEntity: resolveEntityMock }));

const { GET } = await import('#src/app/llms/[[...path]]/route');

function call(path: string[]): Promise<Response> {
    return GET(new Request('https://docs.seedcord.org/llms'), { params: Promise.resolve({ path }) });
}

describe('GET /llms/[[...path]]', () => {
    it('returns a 404 markdown response for a path that is not a package entity', async () => {
        const res = await call(['nope.md']);
        expect(res.status).toBe(404);
        expect(res.headers.get('content-type')).toContain('text/markdown');
    });

    it('returns a 404 for a path without the .md extension', async () => {
        const res = await call(['packages', 'kit', '1.0.0', 'classes', 'thing']);
        expect(res.status).toBe(404);
    });

    it('renders the entity markdown for a resolved entity path', async () => {
        // only the fields entityToMarkdown reads
        resolveEntityMock.mockResolvedValue({
            entry: { id: 'kit', label: 'kit' },
            version: { id: '1.0.0', label: '1.0.0' },
            entity: {
                kind: 'class',
                name: 'Thing',
                displayPackage: 'kit',
                summary: [],
                summaryExamples: [],
                constructors: [],
                properties: [],
                methods: [],
                signature: { text: 'class Thing', html: null }
            },
            segments: ['classes', 'thing']
        });

        const res = await call(['packages', 'kit', '1.0.0', 'classes', 'thing.md']);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/markdown');
        const body = await res.text();
        expect(body).toContain('# Thing');
        expect(body).toContain('class Thing');
    });
});
