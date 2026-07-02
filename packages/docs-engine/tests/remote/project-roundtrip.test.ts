import { beforeAll, describe, expect, it } from 'vitest';

import { deserializeProject, serializeProject } from '@remote/project-file';

import { getMockPackage } from '../utils/test-helpers';

import type { DocProjectFile } from '@remote/project-file';
import type { DocPackageModel } from '@src/types';

let original: DocPackageModel;

describe('project-file serialize/deserialize roundtrip', () => {
    beforeAll(async () => {
        original = await getMockPackage();
    });

    it('serializes to a JSON-safe DocProjectFile', () => {
        const file = serializeProject(original);
        expect(file.schemaVersion).toBe(1);
        expect(file.package).toEqual({ name: original.manifest.name, version: original.manifest.version });
        expect(() => JSON.stringify(file)).not.toThrow();
    });

    it('rebuilds the same indexes, search, and directory after a JSON roundtrip', () => {
        // eslint-disable-next-line unicorn/prefer-structured-clone -- exercises the JSON wire round-trip the remote docs format uses
        const wire = JSON.parse(JSON.stringify(serializeProject(original))) as DocProjectFile;
        const restored = deserializeProject(wire);

        expect(restored.manifest.name).toBe(original.manifest.name);
        expect(restored.manifest.version).toBe(original.manifest.version);
        expect(restored.packageDocumentation?.summary).toBe(original.packageDocumentation?.summary);

        expect([...restored.indexes.bySlug.keys()].sort()).toEqual([...original.indexes.bySlug.keys()].sort());
        expect([...restored.indexes.byQName.keys()].sort()).toEqual([...original.indexes.byQName.keys()].sort());
        expect(restored.indexes.search.map((entry) => entry.slug)).toEqual(
            original.indexes.search.map((entry) => entry.slug)
        );
        expect(restored.directory.snapshot()).toEqual(original.directory.snapshot());
    });

    it('rebuilds a representative node with its children intact', () => {
        const restored = deserializeProject(serializeProject(original));
        const restoredClass = restored.indexes.bySlug.get('mock-class');
        const originalClass = original.indexes.bySlug.get('mock-class');

        expect(restoredClass?.qualifiedName).toBe(originalClass?.qualifiedName);
        expect(restoredClass?.kind).toBe(originalClass?.kind);
        expect(restoredClass?.children.map((child) => child.slug)).toEqual(
            originalClass?.children.map((child) => child.slug)
        );
    });
});
