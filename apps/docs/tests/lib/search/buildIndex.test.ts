import { DocKind as Kind } from '@seedcord/docs-engine/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { searchIndexFor, searchPackages } from '#lib/search/buildIndex';

import type { DocNode, DocSearchEntry, PackageIndexEntry } from '@seedcord/docs-engine';

function stableAt(latest: string): PackageIndexEntry['stable'] {
    const [major = '0', minor = '0'] = latest.split('.');
    return { latest, latestByMinor: { [`${major}.${minor}`]: latest }, latestByMajor: { [major]: latest } };
}

const engineStub = {
    ready: vi.fn<() => Promise<void>>(),
    listPackages: vi.fn<() => Promise<{ folder: string; fullName: string }[]>>(),
    getEntry: vi.fn<(folder: string) => Promise<PackageIndexEntry | null>>(),
    setVersion: vi.fn<(folder: string, selector: string) => Promise<void>>(),
    getPackage: vi.fn<(fullName: string) => { indexes: { search: DocSearchEntry[] } } | null>(),
    getNodeByGlobalSlug: vi.fn<(packageName: string, slug: string) => DocNode | null>(),
    getNodeBySlug: vi.fn<(packageName: string, slug: string) => DocNode | null>()
};

vi.mock('#lib/docs/engine', () => ({
    getDocsEngine: () => Promise.resolve(engineStub)
}));

function makeEntry(overrides: Partial<DocSearchEntry> = {}): DocSearchEntry {
    return {
        slug: 'thing',
        name: 'Thing',
        qualifiedName: 'Thing',
        packageName: 'seedcord',
        packageVersion: '1.0.0',
        kind: Kind.Class,
        summary: null,
        tokens: [],
        ...overrides
    };
}

function indexes(...entries: DocSearchEntry[]): void {
    engineStub.getPackage.mockReturnValue({ indexes: { search: entries } });
}

beforeEach(() => {
    vi.resetAllMocks();
    engineStub.ready.mockResolvedValue(undefined);
    engineStub.listPackages.mockResolvedValue([{ folder: 'seedcord', fullName: 'seedcord' }]);
    engineStub.getEntry.mockResolvedValue({ fullName: 'seedcord', stable: stableAt('1.0.0'), prerelease: null });
    engineStub.setVersion.mockResolvedValue(undefined);
    engineStub.getNodeByGlobalSlug.mockReturnValue(null);
    engineStub.getNodeBySlug.mockReturnValue(null);
    indexes();
});

describe('searchPackages', () => {
    it('lists each package with its stable and pre-release heads', async () => {
        engineStub.listPackages.mockResolvedValue([{ folder: 'logger', fullName: '@seedcord/logger' }]);
        engineStub.getEntry.mockResolvedValue({
            fullName: '@seedcord/logger',
            stable: stableAt('2.1.0'),
            prerelease: { latest: '3.0.0-next.1' }
        });

        await expect(searchPackages()).resolves.toEqual([
            { id: 'logger', label: 'logger', fullName: '@seedcord/logger', stable: '2.1.0', prerelease: '3.0.0-next.1' }
        ]);
    });
});

describe('searchIndexFor', () => {
    it('loads the package at the requested version', async () => {
        await searchIndexFor('seedcord', '0.5.0');
        expect(engineStub.setVersion).toHaveBeenCalledWith('seedcord', '0.5.0');
    });

    it('returns null for a package the index does not list', async () => {
        await expect(searchIndexFor('ghost', '1.0.0')).resolves.toBeNull();
    });

    describe('member links', () => {
        // only the fields the link builder reads
        const node = (slug: string, kind: number): DocNode =>
            ({ slug, kind, packageVersion: '1.0.0', sourcePackage: { name: 'seedcord', version: '1.0.0' } }) as DocNode;

        beforeEach(() => {
            const nodes = new Map([
                ['logger', node('logger', Kind.Class)],
                ['logger/info', node('logger/info', Kind.Method)]
            ]);
            engineStub.getNodeByGlobalSlug.mockImplementation((_pkg, slug) => nodes.get(slug) ?? null);
        });

        it('links a method to its anchor on the owning class page', async () => {
            indexes(makeEntry({ slug: 'logger/info', kind: Kind.Method }));
            const [result] = (await searchIndexFor('seedcord', '1.0.0')) ?? [];
            expect(result?.action.href).toBe('/packages/seedcord/1.0.0/classes/logger#info');
        });

        it('links a parameter to the member that declares it', async () => {
            indexes(makeEntry({ slug: 'logger/info/message', kind: Kind.Parameter }));
            const [result] = (await searchIndexFor('seedcord', '1.0.0')) ?? [];
            expect(result?.action.href).toBe('/packages/seedcord/1.0.0/classes/logger#info');
        });
    });

    it('links a kind outside the table as a page under the package version', async () => {
        indexes(makeEntry({ slug: 'space', kind: Kind.Namespace }));
        const [result] = (await searchIndexFor('seedcord', '1.0.0')) ?? [];
        expect(result?.action).toMatchObject({ kind: 'page', href: '/packages/seedcord/1.0.0/space' });
    });

    it('builds the action a result row shows', async () => {
        indexes(makeEntry({ slug: 'logger', name: 'Logger', qualifiedName: 'Logger', summary: 'A logger.' }));
        const [result] = (await searchIndexFor('seedcord', '1.0.0')) ?? [];
        expect(result?.action).toEqual({
            id: 'seedcord:logger:128',
            label: 'Logger',
            path: 'seedcord@1.0.0 · logger',
            href: '/packages/seedcord/1.0.0/classes/logger',
            kind: 'class',
            description: 'A logger.'
        });
    });

    it('uses the qualified name in the breadcrumb when it differs from the name', async () => {
        indexes(makeEntry({ slug: 'logger/info', name: 'info', qualifiedName: 'Logger.info', kind: Kind.Method }));
        const [result] = (await searchIndexFor('seedcord', '1.0.0')) ?? [];
        expect(result?.action.path).toBe('seedcord@1.0.0 · Logger.info');
    });

    it('leaves out entries with an empty slug', async () => {
        indexes(makeEntry({ slug: '' }), makeEntry({ slug: 'keeper' }));
        const results = (await searchIndexFor('seedcord', '1.0.0')) ?? [];
        expect(results.map((result) => result.action.id)).toEqual(['seedcord:keeper:128']);
    });

    it('keeps the fields the scorer reads and leaves out the summary', async () => {
        indexes(makeEntry({ tokens: ['thing'], aliases: ['Thing()'], summary: 'Text.' }));
        const [result] = (await searchIndexFor('seedcord', '1.0.0')) ?? [];
        expect(result).toMatchObject({ slug: 'thing', tokens: ['thing'], aliases: ['Thing()'], kind: Kind.Class });
        expect(result).not.toHaveProperty('summary');
    });
});
