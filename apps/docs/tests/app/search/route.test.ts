import { describe, expect, it, vi } from 'vitest';

const { searchIndexForMock } = vi.hoisted(() => ({ searchIndexForMock: vi.fn() }));
vi.mock('#lib/search/buildIndex', () => ({ searchIndexFor: searchIndexForMock }));

const { GET } = await import('#src/app/search/[packageId]/[file]/route');

function call(packageId: string, file: string): Promise<Response> {
    return GET(new Request('https://seedcord.org/docs/search'), { params: Promise.resolve({ packageId, file }) });
}

describe('GET /search/[packageId]/[file]', () => {
    it('serves the index of the version in the file name', async () => {
        searchIndexForMock.mockResolvedValue([{ slug: 'logger' }]);

        const res = await call('core', '0.9.2.json');

        expect(searchIndexForMock).toHaveBeenCalledWith('core', '0.9.2');
        await expect(res.json()).resolves.toEqual([{ slug: 'logger' }]);
    });

    it('returns a 404 for a file without the .json extension', async () => {
        expect((await call('core', '0.9.2')).status).toBe(404);
    });

    it('fails the build when the index does not build', async () => {
        searchIndexForMock.mockRejectedValue(new Error('project.json is missing'));
        await expect(call('core', '0.9.2.json')).rejects.toThrow('project.json is missing');
    });
});
