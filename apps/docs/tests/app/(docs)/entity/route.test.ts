import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/(docs)/entity/route';

import type { EntityModel } from '@lib/docs/types';
import type { NextRequest } from 'next/server';

const engineStub = {
    listPackages: vi.fn<() => Promise<{ folder: string; fullName: string }[]>>(),
    setVersion: vi.fn<(folder: string, selector: string) => Promise<void>>(),
    activeVersion: vi.fn<(packageName: string) => string | null>()
};

const loadEntityModel = vi.fn<(...args: unknown[]) => Promise<EntityModel | null>>();

vi.mock('@lib/docs/engine', () => ({
    getDocsEngine: () => Promise.resolve(engineStub)
}));
vi.mock('@lib/docs/loadEntityModel', () => ({
    loadEntityModel: (...args: unknown[]) => loadEntityModel(...args)
}));

function makeRequest(url: string): NextRequest {
    // justified: route only reads nextUrl.searchParams + url; the real NextRequest pulls in Next internals.
    return { nextUrl: new URL(url), url } as unknown as NextRequest;
}

function location(res: Response): URL {
    return new URL(res.headers.get('location') ?? '');
}

beforeEach(() => {
    engineStub.listPackages.mockReset();
    engineStub.setVersion.mockReset();
    engineStub.activeVersion.mockReset();
    loadEntityModel.mockReset();

    engineStub.listPackages.mockResolvedValue([{ folder: 'logger', fullName: '@seedcord/logger' }]);
    engineStub.setVersion.mockResolvedValue(undefined);
    engineStub.activeVersion.mockReturnValue('0.11.0-next.0');
    loadEntityModel.mockResolvedValue(null);
});

describe('GET /entity', () => {
    it('bounces to / when the index has no packages', async () => {
        engineStub.listPackages.mockResolvedValue([]);
        const res = await GET(makeRequest('https://example.com/entity?pkg=logger&slug=Thing'));
        expect(res.status).toBe(307);
        expect(location(res).pathname).toBe('/');
        expect(engineStub.setVersion).not.toHaveBeenCalled();
    });

    it('bounces to / when setVersion throws', async () => {
        engineStub.setVersion.mockRejectedValue(new Error('no version'));
        const res = await GET(makeRequest('https://example.com/entity?pkg=logger&slug=Thing'));
        expect(location(res).pathname).toBe('/');
    });

    it('lands on the package index with ?moved when the symbol is not found', async () => {
        loadEntityModel.mockResolvedValue(null);
        const res = await GET(makeRequest('https://example.com/entity?pkg=logger&slug=OldThing'));
        const url = location(res);
        expect(res.status).toBe(307);
        expect(url.pathname).toBe('/packages/logger/0.11.0-next.0');
        expect(url.searchParams.get('moved')).toBe('OldThing');
        expect(engineStub.setVersion).toHaveBeenCalledWith('logger', 'latest');
    });

    it('redirects to the entity page when the symbol resolves', async () => {
        // justified: the route only reads manifestPackage/slug/version/kind, so a partial literal stands in for EntityModel.
        loadEntityModel.mockResolvedValue({
            manifestPackage: '@seedcord/logger',
            slug: 'logger',
            version: '0.11.0-next.0',
            kind: 'class'
        } as unknown as EntityModel);

        const res = await GET(makeRequest('https://example.com/entity?pkg=logger&slug=logger'));
        const url = location(res);
        expect(url.pathname).toBe('/packages/logger/0.11.0-next.0/classes/logger');
        expect(url.searchParams.get('moved')).toBeNull();
    });
});
