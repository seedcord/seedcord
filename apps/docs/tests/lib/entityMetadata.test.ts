import { describe, expect, it } from 'vitest';

import { resolveEntityTone } from '../../src/lib/entityMetadata';

describe('resolveEntityTone', () => {
    describe('canonical kinds', () => {
        it.each([
            ['class', 'class'],
            ['interface', 'interface'],
            ['type', 'type'],
            ['function', 'function'],
            ['enum', 'enum'],
            ['variable', 'variable']
        ] as const)('maps canonical %s to %s', (input, expected) => {
            expect(resolveEntityTone(input)).toBe(expected);
        });
    });

    describe('synonym aliases', () => {
        it.each([
            ['typealias', 'type'],
            ['alias', 'type'],
            ['method', 'function'],
            ['parameter', 'type'],
            ['const', 'variable'],
            ['constant', 'variable'],
            ['property', 'variable'],
            ['enumeration', 'enum']
        ] as const)('maps synonym %s to %s', (input, expected) => {
            expect(resolveEntityTone(input)).toBe(expected);
        });
    });

    describe('plural / morphological candidates', () => {
        it.each([
            ['classes', 'class'],
            ['interfaces', 'interface'],
            ['types', 'type'],
            ['functions', 'function'],
            ['enums', 'enum'],
            ['variables', 'variable'],
            ['methods', 'function'],
            ['constants', 'variable'],
            ['properties', 'variable'],
            ['enumerations', 'enum']
        ] as const)('strips morphological suffix on %s to %s', (input, expected) => {
            expect(resolveEntityTone(input)).toBe(expected);
        });
    });

    describe('case insensitivity', () => {
        it.each([
            ['CLASS', 'class'],
            ['Interface', 'interface'],
            ['TypeAlias', 'type'],
            ['METHOD', 'function'],
            ['Constant', 'variable'],
            ['Enumeration', 'enum']
        ] as const)('normalizes casing for %s', (input, expected) => {
            expect(resolveEntityTone(input)).toBe(expected);
        });

        it('trims surrounding whitespace', () => {
            expect(resolveEntityTone('   function   ')).toBe('function');
        });
    });

    describe('fallback handling', () => {
        it('falls back to class for unknown input', () => {
            expect(resolveEntityTone('widget')).toBe('class');
        });

        it('falls back to class for undefined', () => {
            expect(resolveEntityTone(undefined)).toBe('class');
        });

        it('falls back to class for null', () => {
            expect(resolveEntityTone(null)).toBe('class');
        });

        it('falls back to class for empty string', () => {
            expect(resolveEntityTone('')).toBe('class');
        });

        it('falls back to class for whitespace-only input', () => {
            expect(resolveEntityTone('   ')).toBe('class');
        });
    });
});
