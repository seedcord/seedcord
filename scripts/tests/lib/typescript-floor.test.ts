import { describe, expect, it } from 'vite-plus/test';

import { errorsInside, lowestTypescript } from '#src/lib/typescript-floor';

const WORKSPACE = `catalogs:\n  consumerLint:\n    typescript: '>=5.9.3 <6.1.0'\n`;

const OWN = ['packages/http/dist/', 'mocks/edge/src/'];

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

describe('errorsInside', () => {
    it('keeps errors in the given folders', () => {
        const errors = [
            "packages/http/dist/edge.d.mts(12,5): error TS2420: Class 'Seedcord' incorrectly implements interface 'Core'.",
            "mocks/edge/src/handlers/Ping.ts(14,40): error TS2339: Property 'PINGS' does not exist on type 'Env'."
        ];

        expect(errorsInside(errors, OWN)).toEqual(errors);
    });

    it('ignores errors in installed packages and generated files', () => {
        const errors = [
            "node_modules/.pnpm/@types+node@26.1.2/node_modules/@types/node/web-globals/url.d.ts(6,15): error TS2300: Duplicate identifier 'URL'.",
            "node_modules/.pnpm/@sapphire+shapeshift@4.0.0/node_modules/@sapphire/shapeshift/dist/cjs/index.d.cts(1,10): error TS2305: Module 'util' has no exported member 'InspectOptionsStylized'.",
            "mocks/edge/worker-configuration.d.ts(58,15): error TS2300: Duplicate identifier 'DOMException'."
        ];

        expect(errorsInside(errors, OWN)).toEqual([]);
    });

    it('keeps errors that belong to no file', () => {
        const errors = ["error TS6053: File 'mocks/edge/tsconfig.json' not found."];

        expect(errorsInside(errors, OWN)).toEqual(errors);
    });
});
