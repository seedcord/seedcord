import { describe, expect, it, vi } from 'vitest';

import type { ResolvedEntity } from '#lib/docs/resolveEntity';

const resolveEntity = vi.fn<() => Promise<ResolvedEntity | null>>();

vi.mock('#lib/docs/resolveEntity', () => ({ resolveEntity }));

const { default: EntityLayout } =
    await import('#src/app/(docs)/packages/[packageId]/[versionId]/[...entitySegments]/layout');

const PARAMS = Promise.resolve({ packageId: 'utils', versionId: '0.8.14', entitySegments: ['interfaces', 'gone'] });

describe('entity layout', () => {
    it('throws notFound for a symbol the version does not have', async () => {
        resolveEntity.mockResolvedValue(null);

        // next marks a notFound() throw with this digest
        await expect(EntityLayout({ children: null, params: PARAMS })).rejects.toMatchObject({
            digest: 'NEXT_HTTP_ERROR_FALLBACK;404'
        });
    });

    it('renders the page for a symbol that exists', async () => {
        // justified: the layout only checks that resolveEntity found something
        resolveEntity.mockResolvedValue({} as ResolvedEntity);

        await expect(EntityLayout({ children: 'page', params: PARAMS })).resolves.toBe('page');
    });
});
