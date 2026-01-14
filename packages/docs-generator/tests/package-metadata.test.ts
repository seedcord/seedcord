import { ReflectionKind, type JSONOutput } from 'typedoc';
import { beforeAll, describe, expect, it } from 'vitest';

import { sharedDocs } from './utils/setup';

describe('Package Metadata Tests', () => {
    let docs: JSONOutput.ProjectReflection;

    beforeAll(() => {
        docs = sharedDocs;
    });

    it('should have correct schema version', () => {
        expect(docs.schemaVersion).toBe('2.0');
    });

    it('should have correct project variant', () => {
        expect(docs.variant).toBe('project');
    });

    it('should have correct project kind', () => {
        expect(docs.kind).toBe(ReflectionKind.Project);
    });

    it('should have a valid id', () => {
        expect(docs.id).toBeDefined();
        expect(typeof docs.id).toBe('number');
        expect(docs.id).toBe(0); // Project should have id 0
    });

    it('should have empty flags object', () => {
        expect(docs.flags).toBeDefined();
        expect(Object.keys(docs.flags)).toHaveLength(0);
    });

    it('should have children array', () => {
        expect(docs.children).toBeDefined();
        expect(Array.isArray(docs.children)).toBe(true);
        expect(docs.children?.length).toBeGreaterThan(0);
    });

    it('should have groups array with proper structure', () => {
        expect(docs.groups).toBeDefined();
        expect(Array.isArray(docs.groups)).toBe(true);
        expect(docs.groups?.length).toBeGreaterThan(0);

        // Check that each group has required properties
        for (const group of docs.groups ?? []) {
            expect(group.title).toBeDefined();
            expect(typeof group.title).toBe('string');
            expect(group.children).toBeDefined();
            expect(Array.isArray(group.children)).toBe(true);
        }
    });

    it('should have symbolIdMap with comprehensive entries', () => {
        const symbolIdMap = (docs as unknown as { symbolIdMap: Record<string, unknown> }).symbolIdMap;
        expect(symbolIdMap).toBeDefined();
        expect(typeof symbolIdMap).toBe('object');

        // Should have many entries (146+ as mentioned in the analysis)
        expect(Object.keys(symbolIdMap).length).toBeGreaterThanOrEqual(100);

        // Check structure of first entry
        const firstEntry = symbolIdMap['0'];
        expect(firstEntry).toBeDefined();
        expect(typeof firstEntry).toBe('object');
    });

    it('should have files structure', () => {
        const files = (docs as unknown as { files: unknown }).files;
        expect(files).toBeDefined();
        expect(typeof files).toBe('object');
    });

    it('should have correct package name and version properties', () => {
        expect((docs as unknown as { packageName: string }).packageName).toBe('@seedcord/mock-docs');
        expect((docs as unknown as { packageVersion: string }).packageVersion).toBe('0.0.0');
    });

    it('should have all expected top-level groups', () => {
        const groupTitles = docs.groups?.map((g) => g.title);

        // Based on the JSON analysis, these are the expected groups
        expect(groupTitles).toContain('Enumerations');
        expect(groupTitles).toContain('Classes');
        expect(groupTitles).toContain('Interfaces');
        expect(groupTitles).toContain('Type Aliases');
        expect(groupTitles).toContain('Functions');
        expect(groupTitles).toContain('Variables');
    });

    it('should have children in groups matching group children arrays', () => {
        // Verify that all children referenced in groups exist
        for (const group of docs.groups ?? []) {
            for (const childId of group.children ?? []) {
                const child = docs.children?.find((c) => c.id === childId);
                expect(child).toBeDefined();
            }
        }
    });

    it('should have consistent symbolIdMap entries', () => {
        const symbolIdMap = (
            docs as unknown as { symbolIdMap: Record<string, { packageName: string; qualifiedName: string }> }
        ).symbolIdMap;

        // Check a few key entries
        expect(symbolIdMap['0']?.qualifiedName).toBe(''); // Root project

        // Verify that symbolIdMap contains entries for major components
        const qualifiedNames = Object.values(symbolIdMap).map((entry) => entry.qualifiedName);
        expect(qualifiedNames).toContain('MockClass');
        expect(qualifiedNames).toContain('MockEnum');
        expect(qualifiedNames).toContain('MockInterface');
        expect(qualifiedNames).toContain('mockFunction');
    });
});
