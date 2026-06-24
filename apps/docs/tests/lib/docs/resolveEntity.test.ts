import { describe, expect, it, vi } from 'vitest';

// Each getDocsEngine call returns a fresh engine. This reproduces the OG route handler, where React
// cache() does not dedupe the engine the way it does inside a page render. loadEntityModel only finds
// the node when setVersion ran on the SAME engine it receives, so resolveEntity must use one instance.
const { getEngineStub } = vi.hoisted(() => ({
    getEngineStub: vi.fn(() => {
        const engine = {
            versionSet: false,
            setVersion: vi.fn(() => {
                engine.versionSet = true;
                return Promise.resolve();
            })
        };
        return Promise.resolve(engine);
    })
}));

vi.mock('../../../src/lib/docs/engine', () => ({ getDocsEngine: getEngineStub }));
vi.mock('../../../src/lib/docs/pageContext', () => ({
    getCatalogContext: () =>
        Promise.resolve({ entry: { id: 'kit', manifestName: '@seedcord/kit' }, version: { id: '1.0.0' } })
}));
vi.mock('@seedcord/docs-engine', () => ({ parseEntityPathSegments: () => ({ slug: 'thing', tone: 'class' }) }));
// the bug source: loadActiveVersion fetches its OWN engine and sets the version on that one.
vi.mock('../../../src/lib/docs/catalog', () => ({
    loadActiveVersion: vi.fn(async () => {
        const engine = await getEngineStub();
        await engine.setVersion();
        return [];
    })
}));
// resolves to a model only when the engine it was handed already has its version set.
vi.mock('../../../src/lib/docs/loadEntityModel', () => ({
    loadEntityModel: (engine: { versionSet: boolean }) =>
        Promise.resolve(engine.versionSet ? { name: 'Thing', kind: 'class', displayPackage: 'kit', summary: [] } : null)
}));

const { resolveEntity } = await import('@lib/docs/resolveEntity');

describe('resolveEntity', () => {
    it('sets the version and loads the model on one engine instance, with no cache dedup', async () => {
        const resolved = await resolveEntity({
            packageId: 'kit',
            versionId: '1.0.0',
            entitySegments: ['classes', 'thing']
        });
        expect(resolved?.entity.name).toBe('Thing');
    });
});
