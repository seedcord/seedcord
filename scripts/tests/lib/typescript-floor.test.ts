import { describe, expect, it } from 'vitest';

import { lowestTypescript } from '#src/lib/typescript-floor';

const WORKSPACE = `catalogs:\n  consumerLint:\n    typescript: '>=5.9.3 <6.1.0'\n`;

describe('lowestTypescript', () => {
    it("reads the lowest version of a catalog's typescript range", () => {
        expect(lowestTypescript(WORKSPACE, 'consumerLint')).toBe('5.9.3');
    });

    it('throws for a catalog with no typescript range', () => {
        expect(() => lowestTypescript(WORKSPACE, 'consumerTypes')).toThrow(
            "pnpm-workspace.yaml's consumerTypes catalog has no typescript range"
        );
    });
});
