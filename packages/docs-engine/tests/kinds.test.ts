import { ReflectionKind } from 'typedoc';
import { describe, expect, it } from 'vitest';

import { kindKey, kindLabel, kindName } from '../src/kinds';

type ReflectionKindWithSingular = Omit<typeof ReflectionKind, 'singularString'> & {
    singularString?: ((value: ReflectionKind) => string) | undefined;
};

describe('kinds helpers', () => {
    it('falls back to enum labels when no singularString hook exists', () => {
        const refKind = ReflectionKind as ReflectionKindWithSingular;
        const original = refKind.singularString;
        refKind.singularString = undefined;
        try {
            expect(kindLabel(ReflectionKind.Interface)).toBe('Interface');
        } finally {
            refKind.singularString = original;
        }
    });

    it('prefers singularString overrides when provided', () => {
        const refKind = ReflectionKind as ReflectionKindWithSingular;
        const original = refKind.singularString;
        refKind.singularString = (value) => (value === ReflectionKind.Class ? 'SingularClass' : 'Other');
        try {
            expect(kindLabel(ReflectionKind.Class)).toBe('SingularClass');
        } finally {
            refKind.singularString = original;
        }
    });

    it('strips the kind_ prefix for keys and camel-cases the result for names', () => {
        const enumStore = ReflectionKind as unknown as Record<string, string>;
        const refKind = ReflectionKind as ReflectionKindWithSingular;
        const originalSingular = refKind.singularString;
        refKind.singularString = undefined;
        const propertyKey = String(ReflectionKind.Enum);
        const originalDescriptor = Object.getOwnPropertyDescriptor(enumStore, propertyKey);
        Object.defineProperty(enumStore, propertyKey, {
            ...(originalDescriptor ?? { configurable: true, enumerable: true, writable: true }),
            value: 'kind_test_enum'
        });

        try {
            expect(kindKey(ReflectionKind.Enum)).toBe('test_enum');
            expect(kindName(ReflectionKind.Enum)).toBe('testEnum');
        } finally {
            refKind.singularString = originalSingular;
            if (originalDescriptor) {
                Object.defineProperty(enumStore, propertyKey, originalDescriptor);
            }
        }
    });
});
