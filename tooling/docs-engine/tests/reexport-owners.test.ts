import { describe, expect, it } from 'vitest';

import { findReexportsMissingFromOwner } from '#model/reexport-owners';

describe('findReexportsMissingFromOwner', () => {
    it('reports a symbol its declaring package never exports', () => {
        const found = findReexportsMissingFromOwner([
            { name: 'logger', reexports: [{ name: 'paint', packageName: 'errors' }], exportedNames: ['Logger'] },
            { name: 'errors', reexports: [], exportedNames: ['SeedcordErrorCode'] }
        ]);

        expect(found).toEqual(['logger re-exports paint, which errors never exports']);
    });

    it('accepts a symbol its declaring package exports', () => {
        const found = findReexportsMissingFromOwner([
            { name: 'gateway', reexports: [{ name: 'paint', packageName: 'errors' }], exportedNames: [] },
            { name: 'errors', reexports: [], exportedNames: ['paint'] }
        ]);

        expect(found).toEqual([]);
    });

    it('accepts a symbol the owner exports and hides with @internal', () => {
        const found = findReexportsMissingFromOwner([
            { name: 'gateway', reexports: [{ name: 'DeepGet', packageName: 'utils' }], exportedNames: [] },
            { name: 'utils', reexports: [], exportedNames: ['DeepGet'] }
        ]);

        expect(found).toEqual([]);
    });

    it('skips an owner outside the workspace', () => {
        const found = findReexportsMissingFromOwner([
            { name: 'gateway', reexports: [{ name: 'REST', packageName: '@discordjs/rest' }], exportedNames: [] }
        ]);

        expect(found).toEqual([]);
    });
});
