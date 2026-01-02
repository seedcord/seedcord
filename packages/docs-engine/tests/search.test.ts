import { ReflectionKind } from 'typedoc';
import { describe, it, expect } from 'vitest';

import { DocsEngine } from '../src/engine';

import type { DocCollection, DocPackageModel, DocSearchEntry, DocManifest } from '../src/types';

// Helper to create a dummy search entry
function createEntry(name: string, packageName = 'test-pkg'): DocSearchEntry {
    return {
        name,
        slug: name.toLowerCase(),
        qualifiedName: name,
        packageName,
        kind: ReflectionKind.Class,
        summary: null,
        tokens: [name.toLowerCase()],
        packageVersion: '1.0.0'
    };
}

describe('DocsEngine Search', () => {
    const entries = [
        createEntry('Seedcord'),
        createEntry('MongoService'),
        createEntry('AuthService'),
        createEntry('User'),
        createEntry('UserProfile'),
        createEntry('SomethingElse')
    ];

    const mockPackage = {
        manifest: { name: 'test-pkg' },
        indexes: { search: entries },
        directory: {}
    } as unknown as DocPackageModel;

    const mockCollection: DocCollection = {
        manifest: {} as unknown as DocManifest,
        packages: [mockPackage],
        byKey: new Map(),
        byGlobalSlug: new Map()
    };

    // Access private constructor
    const DocsEngineConstructor = DocsEngine as unknown as new (collection: DocCollection) => DocsEngine;
    const engine = new DocsEngineConstructor(mockCollection);

    it('should find exact match', () => {
        const results = engine.search('Seedcord');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]?.name).toBe('Seedcord');
    });

    it('should find fuzzy match', () => {
        // Typo: Seedcrd
        const results = engine.search('Seedcrd');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]?.name).toBe('Seedcord');
    });

    it('should find fuzzy match with more typos', () => {
        // Typo: Sedcord
        const results = engine.search('Sedcord');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]?.name).toBe('Seedcord');
    });

    it('should find prefix match', () => {
        const results = engine.search('Mongo');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]?.name).toBe('MongoService');
    });

    it('should handle empty query', () => {
        const results = engine.search('');
        expect(results).toEqual([]);
    });

    it('should prioritize exact match over fuzzy', () => {
        const results = engine.search('User');
        expect(results[0]?.name).toBe('User');
    });
});
