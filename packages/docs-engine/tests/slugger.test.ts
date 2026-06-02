import { describe, expect, it } from 'vitest';

import { Slugger, slugForNode, slugifySegment } from '@src/Slugger';

describe('Slugger', () => {
    it('slugifies individual segments', () => {
        expect(slugifySegment('MockClass<TypeT>')).toBe('mock-class');
        expect(slugifySegment('already-slugged')).toBe('already-slugged');
        expect(slugifySegment(' spaced Out ')).toBe('spaced-out');
        expect(slugifySegment('')).toBe('item');
    });

    it('generates unique slugs for duplicate inputs', () => {
        const slugger = new Slugger();
        expect(slugger.slug(['MockClass'])).toBe('mock-class');
        expect(slugger.slug(['MockClass'])).toBe('mock-class-2');
        expect(slugger.slug(['MockClass'])).toBe('mock-class-3');
    });

    it('composes nested slugger prefixes', () => {
        const root = new Slugger(['MockClass']);
        const child = root.withPrefix('Constructor');
        expect(root.slug(['method'])).toBe('mock-class/method');
        expect(child.slug(['overload'])).toBe('mock-class/constructor/overload');
        expect(slugForNode(root, ['method'])).toBe('mock-class/method-2');
    });
});
