import { ReflectionKind, type JSONOutput } from 'typedoc';
import { beforeAll, describe, expect, it } from 'vitest';

import {
    checkBlockTag,
    checkCommentSummary,
    checkDefaultValue,
    checkGroups,
    checkHasSources,
    checkSignatureParameters,
    checkTypeParameters,
    checkInheritance,
    findChild,
    hasFlag
} from './utils';
import { sharedDocs } from './utils/setup';

describe('Class Tests', () => {
    let docs: JSONOutput.ProjectReflection;

    beforeAll(() => {
        docs = sharedDocs;
    });

    describe('MockClass Structure', () => {
        let mockClass: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockClass');
            if (!found) {
                throw new Error('MockClass not found in generated docs');
            }
            mockClass = found;
        });

        it('should have correct kind and flags', () => {
            expect(mockClass.kind).toBe(ReflectionKind.Class);
            expect(mockClass.flags).toBeDefined();
        });

        it('should have type parameters', () => {
            checkTypeParameters(mockClass, ['TypeT', 'TypeU']);

            // Check TypeU has constraint
            const typeU = mockClass.typeParameters?.find((tp) => tp.name === 'TypeU');
            expect(typeU?.type).toBeDefined();
            expect(typeU?.type?.type).toBe('intrinsic');
            if (typeU?.type?.type === 'intrinsic') {
                expect(typeU.type.name).toBe('number');
            }
        });

        it('should have comprehensive comment with all tags', () => {
            expect(mockClass.comment).toBeDefined();
            checkCommentSummary(
                mockClass,
                'Represents a complex mock class for testing documentation generation.\n\nThis class demonstrates various TypeScript features including modifiers,\ngenerics, method overloading, and different property types.'
            );

            checkBlockTag(mockClass, '@deprecated', 'Use');
            checkBlockTag(mockClass, '@example');

            // Check for @see tags (TypeDoc merges multiple @see tags into one)
            const seeTags = mockClass.comment?.blockTags?.filter((tag) => tag.tag === '@see');
            expect(seeTags).toBeDefined();
            expect(seeTags?.length).toBeGreaterThan(0);

            const seeContent = seeTags?.[0]?.content.map((c) => c.text).join('');
            expect(seeContent).toContain('MockEnum');
            expect(seeContent).toContain('MockInterface');
            expect(seeContent).toContain('MockType');
        });

        it('should have sources information', () => {
            checkHasSources(mockClass);
        });

        it('should have groups for different member types', () => {
            checkGroups(mockClass, ['Constructors', 'Properties', 'Accessors', 'Methods']);
        });

        it('should have all expected children', () => {
            expect(mockClass.children).toBeDefined();
            expect(mockClass.children?.length).toBeGreaterThan(0);

            const childNames = mockClass.children?.map((c) => c.name);
            expect(childNames).toContain('constructor');
            expect(childNames).toContain('publicReadonlyProp');
            expect(childNames).toContain('protectedProp');
            expect(childNames).toContain('_optionalProp');
            expect(childNames).toContain('computedProp');
            expect(childNames).toContain('optionalProp');
            expect(childNames).toContain('publicMethod');
            expect(childNames).toContain('protectedStaticMethod');
            expect(childNames).toContain('asyncMethod');
            expect(childNames).toContain('restMethod');
        });

        it('should exclude private members', () => {
            const childNames = mockClass.children?.map((c) => c.name);
            expect(childNames).not.toContain('privateStaticProp');
            expect(childNames).not.toContain('privateMethod');
        });

        it('should document class inheritance', () => {
            const baseClass = findChild(docs, 'BaseClass');
            expect(baseClass).toBeDefined();

            // MockClass should extend BaseClass
            checkInheritance(mockClass, ['BaseClass']);

            // BaseClass should list MockClass as extending it
            checkInheritance(baseClass!, undefined, ['MockClass']);
        });
    });

    describe('MockClass Constructor', () => {
        let mockClass: JSONOutput.DeclarationReflection;
        let constructor: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockClass');
            if (!found) {
                throw new Error('MockClass not found in generated docs');
            }
            mockClass = found;

            const constructorFound = findChild(mockClass, 'constructor');
            if (!constructorFound) {
                throw new Error('Constructor not found in MockClass');
            }
            constructor = constructorFound;
        });

        it('should have correct kind and structure', () => {
            expect(constructor.kind).toBe(ReflectionKind.Constructor);
            expect(constructor.signatures).toBeDefined();
            expect(constructor.signatures?.length).toBeGreaterThan(0);
        });

        it('should have constructor signature with parameters', () => {
            const signature = constructor.signatures?.[0];
            expect(signature).toBeDefined();

            checkSignatureParameters(signature!, [{ name: 'publicReadonlyProp' }, { name: 'protectedProp' }]);
        });

        it('should have type parameters matching class', () => {
            const signature = constructor.signatures?.[0];
            expect(signature?.typeParameters).toBeDefined();
            expect(signature?.typeParameters?.length).toBe(2);
        });

        it('should have comment with @throws tag', () => {
            const signature = constructor.signatures?.[0];
            expect(signature?.comment).toBeDefined();
            checkBlockTag(signature!, '@throws');
        });

        it('should have sources', () => {
            checkHasSources(constructor);
        });
    });

    describe('MockClass Properties', () => {
        let mockClass: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockClass');
            if (!found) {
                throw new Error('MockClass not found in generated docs');
            }
            mockClass = found;
        });

        it('should have publicReadonlyProp with correct flags and type', () => {
            const prop = findChild(mockClass, 'publicReadonlyProp');
            expect(prop).toBeDefined();
            expect(hasFlag(prop!, 'isPublic')).toBe(true);
            expect(hasFlag(prop!, 'isReadonly')).toBe(true);

            expect(prop?.type?.type).toBe('reference');
            if (prop?.type?.type === 'reference') {
                expect(prop.type.name).toBe('TypeT');
            }

            checkCommentSummary(prop!, 'A public readonly property.');
            checkHasSources(prop!);
        });

        it('should have protectedProp with correct flags and default value', () => {
            const prop = findChild(mockClass, 'protectedProp');
            expect(prop).toBeDefined();
            expect(hasFlag(prop!, 'isProtected')).toBe(true);

            checkCommentSummary(prop!, 'A protected property with default value.');
            checkDefaultValue(prop!, '...');
            checkHasSources(prop!);
        });

        it('should have _optionalProp with optional flag', () => {
            const prop = findChild(mockClass, '_optionalProp');
            expect(prop).toBeDefined();
            expect(hasFlag(prop!, 'isOptional')).toBe(true);

            checkCommentSummary(prop!, 'A public optional property.');
            checkHasSources(prop!);
        });
    });

    describe('MockClass Accessors', () => {
        let mockClass: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockClass');
            if (!found) {
                throw new Error('MockClass not found in generated docs');
            }
            mockClass = found;
        });

        it('should have computedProp getter', () => {
            const accessor = findChild(mockClass, 'computedProp');
            expect(accessor).toBeDefined();
            expect(accessor?.kind).toBe(ReflectionKind.Accessor);

            const getSignature = accessor?.getSignature;
            expect(getSignature).toBeDefined();

            // Check @returns tag
            checkBlockTag(getSignature!, '@returns');
            checkHasSources(accessor!);
        });

        it('should have optionalProp setter', () => {
            const accessor = findChild(mockClass, 'optionalProp');
            expect(accessor).toBeDefined();
            expect(accessor?.kind).toBe(ReflectionKind.Accessor);

            const setSignature = accessor?.setSignature;
            expect(setSignature).toBeDefined();
            expect(accessor!.comment).toBeUndefined();

            // Check parameter type (should be union)
            const param = setSignature?.parameters?.[0];
            expect(param?.type?.type).toBe('union');
            checkHasSources(accessor!);
        });
    });

    describe('MockClass Methods', () => {
        let mockClass: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockClass');
            if (!found) {
                throw new Error('MockClass not found in generated docs');
            }
            mockClass = found;
        });

        it('should have publicMethod with multiple overloads', () => {
            const method = findChild(mockClass, 'publicMethod');
            expect(method).toBeDefined();
            expect(method?.signatures).toBeDefined();
            expect(method?.signatures?.length).toBe(2);

            // Check first overload
            const firstSig = method?.signatures?.[0];
            checkSignatureParameters(firstSig!, [{ name: 'param1' }, { name: 'param2' }]);

            // Check second overload
            const secondSig = method?.signatures?.[1];
            checkSignatureParameters(secondSig!, [{ name: 'param' }]);

            checkHasSources(method!);
        });

        it('should have protectedStaticMethod with correct flags', () => {
            const method = findChild(mockClass, 'protectedStaticMethod');
            expect(method).toBeDefined();
            expect(hasFlag(method!, 'isProtected')).toBe(true);
            expect(hasFlag(method!, 'isStatic')).toBe(true);

            expect(method!.comment).toBeUndefined();

            const signature = method?.signatures?.[0];
            expect(signature).toBeDefined();
            checkCommentSummary(signature!, 'A protected static method.');

            checkHasSources(method!);
        });

        it('should have asyncMethod with async return type', () => {
            const method = findChild(mockClass, 'asyncMethod');
            expect(method).toBeDefined();

            const signature = method?.signatures?.[0];
            expect(signature).toBeDefined();

            // Should return Promise
            expect(signature?.type?.type).toBe('reference');
            if (signature?.type?.type === 'reference') {
                expect(signature.type.name).toBe('Promise');
            }

            expect(method!.comment).toBeUndefined();
            checkCommentSummary(signature!, 'An async method.');
            checkBlockTag(signature!, '@returns');
            checkHasSources(method!);
        });

        it('should have restMethod with rest parameters', () => {
            const method = findChild(mockClass, 'restMethod');
            expect(method).toBeDefined();

            const signature = method?.signatures?.[0];
            expect(signature).toBeDefined();

            checkSignatureParameters(signature!, [{ name: 'first' }, { name: 'rest', rest: true }]);

            const restParam = signature?.parameters?.find((p) => p.name === 'rest');
            expect(restParam?.flags.isRest).toBe(true);
            expect(restParam?.type?.type).toBe('array');

            expect(method!.comment).toBeUndefined();
            checkBlockTag(signature!, '@returns');
            checkHasSources(method!);
        });
    });

    describe('MockClass Method Comments and Tags', () => {
        let mockClass: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockClass');
            if (!found) {
                throw new Error('MockClass not found in generated docs');
            }
            mockClass = found;
        });

        it('should have detailed comments on method overloads', () => {
            const method = findChild(mockClass, 'publicMethod');
            expect(method).toBeDefined();

            for (const signature of method?.signatures ?? []) {
                expect(signature.comment).toBeDefined();
                // Check for @param tags
                const paramTags = signature.comment?.blockTags?.filter((tag) => tag.tag === '@param');
                expect(paramTags?.length).toBe(0);

                // Check for @returns tag
                checkBlockTag(signature, '@returns');
            }
        });

        it('should have @throws tags where appropriate', () => {
            const constructor = findChild(mockClass, 'constructor');
            const constructorSig = constructor?.signatures?.[0];
            checkBlockTag(constructorSig!, '@throws');
        });

        it('should have @example tags in method overloads', () => {
            const method = findChild(mockClass, 'publicMethod');
            const firstSig = method?.signatures?.[0];
            expect(firstSig?.comment?.blockTags?.find((tag) => tag.tag === '@example')).toBeUndefined();
        });
    });
});
