import { describe, expect, it } from 'vitest';

import { distinctPackageCount } from '../check-workspace-catalog';

type Field = 'devDependencies' | 'peerDependencies';

const ref = (packageJsonPath: string, field: Field): { packageJsonPath: string; field: Field; version: string } => ({
    packageJsonPath,
    field,
    version: 'catalog:peer'
});

describe('distinctPackageCount', () => {
    it('counts one package that lists the dep in two fields once', () => {
        const refs = [
            ref('plugins/kysely-postgres/package.json', 'devDependencies'),
            ref('plugins/kysely-postgres/package.json', 'peerDependencies')
        ];

        expect(distinctPackageCount(refs)).toBe(1);
    });

    it('counts each package that lists the dep', () => {
        const refs = [
            ref('plugins/kysely-postgres/package.json', 'devDependencies'),
            ref('apps/guide/package.json', 'devDependencies')
        ];

        expect(distinctPackageCount(refs)).toBe(2);
    });

    it('returns zero when nothing references the dep', () => {
        expect(distinctPackageCount([])).toBe(0);
    });
});
