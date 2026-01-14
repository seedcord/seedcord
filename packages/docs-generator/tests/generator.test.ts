import { beforeAll, describe, expect, it } from 'vitest';

import { findChild, getBlockTag, getSummaryText } from './utils';
import { sharedDocs } from './utils/setup';

import type { JSONOutput } from 'typedoc';

describe('ApiDocsGenerator Integration', () => {
    let docs: JSONOutput.ProjectReflection;

    beforeAll(() => {
        docs = sharedDocs;
    });

    it('should have correct package name and version', () => {
        expect(docs.name).toBe('@seedcord/mock-docs');
        expect((docs as unknown as { version: string }).version).toBe('0.0.0');
    });

    it('should structure MockClass correctly (Generics, TypeParams)', () => {
        const mockClass = findChild(docs, 'MockClass');
        expect(mockClass).toBeDefined();

        const typeParams = mockClass?.typeParameters;
        expect(typeParams).toHaveLength(2);
        expect(typeParams?.[0]?.name).toBe('TypeT');
        expect(typeParams?.[1]?.name).toBe('TypeU');

        const typeU = typeParams?.[1];
        const uType = typeU?.type;
        expect(uType?.type).toBe('intrinsic');
        if (uType?.type === 'intrinsic') {
            expect(uType.name).toBe('number');
        }

        const summary = getSummaryText(mockClass?.comment);
        expect(summary).toContain('Represents a complex mock class');
    });

    it('should verify MockClass tags (@deprecated, @example)', () => {
        const mockClass = findChild(docs, 'MockClass');
        const deprecatedTag = getBlockTag(mockClass?.comment, '@deprecated');
        expect(deprecatedTag).toBeDefined();
        const text = deprecatedTag?.content.map((c) => c.text).join('');
        expect(text).toContain('Use');
        expect(text).toContain('NewMockClass');

        const exampleTag = getBlockTag(mockClass?.comment, '@example');
        expect(exampleTag).toBeDefined();
    });

    it('should verify MockClass Properties (public, readonly, protected, optional)', () => {
        const mockClass = findChild(docs, 'MockClass');
        if (!mockClass) throw new Error('MockClass not found');

        // Public Readonly
        const publicReadonlyProp = findChild(mockClass, 'publicReadonlyProp');
        expect(publicReadonlyProp).toBeDefined();
        expect(publicReadonlyProp?.flags.isPublic).toBe(true);
        expect(publicReadonlyProp?.flags.isReadonly).toBe(true);
        expect(getSummaryText(publicReadonlyProp?.comment)).toBe('A public readonly property.');
        const propType = publicReadonlyProp?.type;
        expect(propType?.type).toBe('reference');
        if (propType?.type === 'reference') {
            expect(propType.name).toBe('TypeT');
        }

        // Protected
        const protectedProp = findChild(mockClass, 'protectedProp');
        expect(protectedProp).toBeDefined();
        expect(protectedProp?.flags.isProtected).toBe(true);

        // Optional
        const optionalProp = findChild(mockClass, '_optionalProp');
        expect(optionalProp).toBeDefined();
        expect(optionalProp?.flags.isOptional).toBe(true);
    });

    it('should exclude private static properties', () => {
        const mockClass = findChild(docs, 'MockClass');
        if (!mockClass) throw new Error('MockClass not found');
        const privateStaticProp = findChild(mockClass, 'privateStaticProp');
        expect(privateStaticProp).toBeUndefined();
    });

    it('should verify MockClass Methods (overloads, protected static)', () => {
        const mockClass = findChild(docs, 'MockClass');
        if (!mockClass) throw new Error('MockClass not found');

        // Overloaded method
        const publicMethod = findChild(mockClass, 'publicMethod');
        expect(publicMethod).toBeDefined();
        const signatures = publicMethod?.signatures;
        expect(signatures).toBeDefined();
        // Just check length
        expect(signatures?.length).toBeGreaterThanOrEqual(2);

        // Static protected method
        const protectedStaticMethod = findChild(mockClass, 'protectedStaticMethod');
        expect(protectedStaticMethod).toBeDefined();
        expect(protectedStaticMethod?.flags.isProtected).toBe(true);
        expect(protectedStaticMethod?.flags.isStatic).toBe(true);
    });

    it('should structure MockEnum correctly', () => {
        const mockEnum = findChild(docs, 'MockEnum');
        expect(mockEnum).toBeDefined();

        // Safe access instead of !
        if (mockEnum) {
            const first = findChild(mockEnum, 'First');
            expect(first).toBeDefined();

            const second = findChild(mockEnum, 'Second');
            expect(second).toBeDefined();

            const secType = second?.type;
            if (secType?.type === 'literal') {
                expect(secType.value).toBe(10);
            } else {
                expect.fail('Expected second to be literal');
            }

            const third = findChild(mockEnum, 'Third');
            expect(third).toBeDefined();
            const thirdType = third?.type;
            if (thirdType?.type === 'literal') {
                expect(thirdType.value).toBe('third');
            } else {
                expect.fail('Expected third to be literal');
            }
        }
    });

    it('should verify Functions with overloads', () => {
        const mockFunction = findChild(docs, 'mockFunction');
        expect(mockFunction).toBeDefined();
        expect(mockFunction?.signatures).toHaveLength(3);
    });

    it('should verify Functions with rest parameters', () => {
        const mockFunctionWithRest = findChild(docs, 'mockFunctionWithRest');
        expect(mockFunctionWithRest).toBeDefined();
        const restSig = mockFunctionWithRest?.signatures?.[0];
        const params = restSig?.parameters;

        expect(params).toBeDefined();
        if (params) {
            expect(params[0]?.name).toBe('required');
            expect(params[1]?.name).toBe('optional');
            expect(params[1]?.flags.isOptional).toBe(true);
            expect(params[2]?.name).toBe('rest');
            expect(params[2]?.flags.isRest).toBe(true);
            expect(params[2]?.type?.type).toBe('array');
        }
    });

    it('should verify Functions with @internal tag', () => {
        const asyncMockFunction = findChild(docs, 'asyncMockFunction');
        expect(asyncMockFunction).toBeDefined();
        const asyncSig = asyncMockFunction?.signatures?.[0];

        const hasModifier = asyncSig?.comment?.modifierTags?.includes('@internal');
        const hasBlock = getBlockTag(asyncSig?.comment, '@internal');

        // Use either/or check safe for lint
        expect(hasModifier || hasBlock ? true : false).toBe(true);
    });

    it('should verify Decorators', () => {
        const logDecorator = findChild(docs, 'LogDecorator');
        expect(logDecorator).toBeDefined();
        const decSig = logDecorator?.signatures?.[0];
        expect(getBlockTag(decSig?.comment, '@decorator')).toBeDefined();
    });

    it('should verify Interface features (Readonly, Optional)', () => {
        const iface = findChild(docs, 'MockInterface');
        expect(iface).toBeDefined();
        if (!iface) throw new Error('MockInterface not found');

        const readonlyProp = findChild(iface, 'readonlyProp');
        expect(readonlyProp).toBeDefined();
        expect(readonlyProp?.flags.isReadonly).toBe(true);

        const optionalMethod = findChild(iface, 'optionalMethod');
        expect(optionalMethod).toBeDefined();
        expect(optionalMethod?.flags.isOptional).toBe(true);
    });

    it('should verify Nested Interface types', () => {
        const iface = findChild(docs, 'MockInterface');
        if (!iface) throw new Error('MockInterface not found');

        const nested = findChild(iface, 'nested');
        expect(nested).toBeDefined();
        expect(nested?.type?.type).toBe('reflection');
        const declaration = (nested?.type as JSONOutput.ReflectionType).declaration;
        expect(declaration).toBeDefined();

        const innerProp = findChild(declaration, 'innerProp');
        expect(innerProp).toBeDefined();
    });

    it('should verify Union types', () => {
        const union = findChild(docs, 'MockUnion');
        expect(union).toBeDefined();
        expect(union?.type?.type).toBe('union');
        expect((union?.type as JSONOutput.UnionType).types).toHaveLength(3);
    });

    it('should verify Intersection types', () => {
        const intersection = findChild(docs, 'MockIntersection');
        expect(intersection).toBeDefined();
        expect(intersection?.type?.type).toBe('intersection');
    });

    it('should verify Tuple types', () => {
        const tuple = findChild(docs, 'MockTuple');
        expect(tuple).toBeDefined();
        expect(tuple?.type?.type).toBe('tuple');
        expect((tuple?.type as JSONOutput.TupleType).elements).toHaveLength(3);
    });

    it('should verify Template Literal types', () => {
        const templateType = findChild(docs, 'MockTemplate');
        expect(templateType).toBeDefined();
        expect(templateType?.type?.type).toBe('templateLiteral');
        const template = templateType?.type as JSONOutput.TemplateLiteralType;
        expect(template.head).toBe('prefix_');
        expect(template.tail).toHaveLength(1);
        expect(template.tail[0]?.[1]).toBe('_suffix');
    });
});
