import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/search/buildIndex', () => ({ searchIndexFor: vi.fn() }));

const { GET } = await import('#src/app/search/[packageId]/[file]/route');

describe('GET /search/[packageId]/[file]', () => {
    it('returns a 404 for a file without the .json extension', async () => {
        const response = await GET(new Request('https://seedcord.org/docs/search'), {
            params: Promise.resolve({ packageId: 'core', file: '0.9.2' })
        });

        expect(response.status).toBe(404);
    });
});
