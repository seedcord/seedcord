import { ReflectionKind, type JSONOutput } from 'typedoc';
import { beforeAll, describe, expect, it } from 'vitest';

import {
    checkBlockTag,
    checkCommentSummary,
    checkGroups,
    checkHasSources,
    checkInherited,
    checkSignatureParameters,
    checkTypeParameters,
    findChild,
    hasFlag
} from './utils';
import { sharedDocs } from './utils/setup';

describe('Interface Tests', () => {
    let docs: JSONOutput.ProjectReflection;

    beforeAll(() => {
        docs = sharedDocs;
    });

    describe('MockInterface Structure', () => {
        let mockInterface: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockInterface');
            if (!found) {
                throw new Error('MockInterface not found in generated docs');
            }
            mockInterface = found;
        });

        it('should have correct kind and flags', () => {
            expect(mockInterface.kind).toBe(ReflectionKind.Interface);
            expect(mockInterface.flags).toBeDefined();
        });

        it('should have type parameters', () => {
            checkTypeParameters(mockInterface, ['TypeT']);
        });

        it('should have comprehensive comment with all tags', () => {
            expect(mockInterface.comment).toBeDefined();
            checkCommentSummary(
                mockInterface,
                'A complex mock interface for testing documentation generation.\n\nThis interface demonstrates various interface features including nested interfaces,\nrecursive types, and different property types.'
            );

            checkBlockTag(mockInterface, '@example');
            checkBlockTag(mockInterface, '@see');
        });

        it('should have sources information', () => {
            checkHasSources(mockInterface);
        });

        it('should have groups for different member types', () => {
            checkGroups(mockInterface, ['Properties', 'Methods']);
        });

        it('should have extendedBy references', () => {
            expect(mockInterface.extendedBy).toBeDefined();
            expect(mockInterface.extendedBy?.length).toBeGreaterThan(0);
        });
    });

    describe('MockInterface Properties', () => {
        let mockInterface: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockInterface');
            if (!found) {
                throw new Error('MockInterface not found in generated docs');
            }
            mockInterface = found;
        });

        it('should have prop with basic structure', () => {
            const prop = findChild(mockInterface, 'prop');
            expect(prop).toBeDefined();
            expect(prop?.type?.type).toBe('reference');
            checkCommentSummary(prop!, 'A required property.');
            checkHasSources(prop!);
        });

        it('should have optionalProp with optional flag', () => {
            const prop = findChild(mockInterface, 'optionalProp');
            expect(prop).toBeDefined();
            expect(hasFlag(prop!, 'isOptional')).toBe(true);
            checkCommentSummary(prop!, 'An optional property.');
            checkHasSources(prop!);
        });

        it('should have readonlyProp with readonly flag', () => {
            const prop = findChild(mockInterface, 'readonlyProp');
            expect(prop).toBeDefined();
            expect(hasFlag(prop!, 'isReadonly')).toBe(true);
            expect(prop?.type?.type).toBe('intrinsic');
            checkCommentSummary(prop!, 'A readonly property.');
            checkHasSources(prop!);
        });

        it('should have nested property with inline type', () => {
            const nested = findChild(mockInterface, 'nested');
            expect(nested).toBeDefined();
            expect(nested?.type?.type).toBe('reflection');

            const declaration = (nested?.type as JSONOutput.ReflectionType).declaration;
            expect(declaration).toBeDefined();

            const innerProp = findChild(declaration, 'innerProp');
            expect(innerProp).toBeDefined();
            checkCommentSummary(innerProp!, 'Nested property.');

            const innerMethod = findChild(declaration, 'innerMethod');
            expect(innerMethod).toBeDefined();
            expect(innerMethod!.comment).toBeUndefined();

            checkHasSources(nested!);
        });
    });

    describe('MockInterface Methods', () => {
        let mockInterface: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockInterface');
            if (!found) {
                throw new Error('MockInterface not found in generated docs');
            }
            mockInterface = found;
        });

        it('should have method with signature', () => {
            const method = findChild(mockInterface, 'method');
            expect(method).toBeDefined();
            expect(method?.signatures).toBeDefined();

            const signature = method?.signatures?.[0];
            checkSignatureParameters(signature!, [{ name: 'input' }]);
            checkHasSources(method!);
        });

        it('should have optionalMethod with optional flag', () => {
            const method = findChild(mockInterface, 'optionalMethod');
            expect(method).toBeDefined();
            expect(hasFlag(method!, 'isOptional')).toBe(true);

            const signature = method?.signatures?.[0];
            checkSignatureParameters(signature!, [{ name: 'value' }]);
            checkHasSources(method!);
        });
    });

    describe('ExtendedInterface', () => {
        let extendedInterface: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'ExtendedInterface');
            if (!found) {
                throw new Error('ExtendedInterface not found in generated docs');
            }
            extendedInterface = found;
        });

        it('should have correct inheritance structure', () => {
            expect(extendedInterface.kind).toBe(ReflectionKind.Interface);
            expect(extendedInterface.extendedTypes).toBeDefined();
            expect(extendedInterface.extendedTypes?.length).toBe(2); // MockInterface and IndexableInterface
        });

        it('should have extendedProp as new property', () => {
            const prop = findChild(extendedInterface, 'extendedProp');
            expect(prop).toBeDefined();
            expect(hasFlag(prop!, 'isInherited')).toBe(false);
            checkCommentSummary(prop!, 'Additional property from extension.');
            checkHasSources(prop!);
        });

        it('should have inherited properties with inherited flag', () => {
            // Find inherited properties from MockInterface
            const inheritedProp = extendedInterface.children?.find(
                (child) => hasFlag(child, 'isInherited') && child.name === 'prop'
            );
            expect(inheritedProp).toBeDefined();
            checkInherited(inheritedProp!);

            expect(inheritedProp?.inheritedFrom).toBeDefined();
        });

        it('should have index signatures from IndexableInterface', () => {
            expect(extendedInterface.indexSignatures).toBeDefined();
            expect(extendedInterface.indexSignatures?.length).toBeGreaterThan(0);
        });

        it('should have comprehensive comment', () => {
            checkCommentSummary(extendedInterface, 'An interface extending multiple interfaces.');
            checkHasSources(extendedInterface);
        });
    });

    describe('IndexableInterface', () => {
        let indexableInterface: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'IndexableInterface');
            if (!found) {
                throw new Error('IndexableInterface not found in generated docs');
            }
            indexableInterface = found;
        });

        it('should have correct structure', () => {
            expect(indexableInterface.kind).toBe(ReflectionKind.Interface);
            checkCommentSummary(indexableInterface, 'An interface with index signatures.');
            checkHasSources(indexableInterface);
        });

        it('should have index signatures', () => {
            expect(indexableInterface.indexSignatures).toBeDefined();
            expect(indexableInterface.indexSignatures?.length).toBe(2);

            const indexSig = indexableInterface.indexSignatures?.[0];
            expect(indexSig).toBeDefined();
            expect(indexSig?.parameters).toBeDefined();
            expect(indexSig?.parameters?.length).toBe(1);

            const param = indexSig?.parameters?.[0];
            expect(param?.type?.type).toBe('intrinsic');
            if (param?.type?.type === 'intrinsic') {
                expect(param.type.name).toBe('string');
            }
        });

        it('should be extended by ExtendedInterface', () => {
            expect(indexableInterface.extendedBy).toBeDefined();
            const extendedByNames = indexableInterface.extendedBy?.map((ref) => ref.name);
            expect(extendedByNames).toContain('ExtendedInterface');
        });
    });

    describe('RecursiveInterface', () => {
        let recursiveInterface: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'RecursiveInterface');
            if (!found) {
                throw new Error('RecursiveInterface not found in generated docs');
            }
            recursiveInterface = found;
        });

        it('should have correct structure', () => {
            expect(recursiveInterface.kind).toBe(ReflectionKind.Interface);
            checkCommentSummary(recursiveInterface, 'A recursive interface.');
            checkHasSources(recursiveInterface);
        });

        it('should have @internal modifier tag', () => {
            const hasModifier = recursiveInterface.comment?.modifierTags?.includes('@internal');
            expect(hasModifier).toBe(true);
        });

        it('should have value property', () => {
            const valueProp = findChild(recursiveInterface, 'value');
            expect(valueProp).toBeDefined();
            expect(valueProp?.type?.type).toBe('intrinsic');
            checkCommentSummary(valueProp!, 'The value of the node.');
            checkHasSources(valueProp!);
        });

        it('should have recursive children property', () => {
            const childrenProp = findChild(recursiveInterface, 'children');
            expect(childrenProp).toBeDefined();
            expect(childrenProp?.type?.type).toBe('array');

            const elementType = (childrenProp?.type as JSONOutput.ArrayType).elementType;
            expect(elementType.type).toBe('reference');
            if (elementType.type === 'reference') {
                expect(elementType.name).toBe('RecursiveInterface');
            }

            checkCommentSummary(childrenProp!, 'The children nodes.');
            checkHasSources(childrenProp!);
        });
    });

    describe('MockObject', () => {
        let mockObject: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockObject');
            if (!found) {
                throw new Error('MockObject not found in generated docs');
            }
            mockObject = found;
        });

        it('should have correct structure', () => {
            expect(mockObject.kind).toBe(ReflectionKind.Interface);
            checkCommentSummary(mockObject, 'A complex object type.');
            checkHasSources(mockObject);
        });

        it('should have prop property', () => {
            const prop = findChild(mockObject, 'prop');
            expect(prop).toBeDefined();
            expect(prop?.type?.type).toBe('intrinsic');
            checkCommentSummary(prop!, 'A property in the object type.');
            checkHasSources(prop!);
        });

        it('should have optional property', () => {
            const optional = findChild(mockObject, 'optional');
            expect(optional).toBeDefined();
            expect(hasFlag(optional!, 'isOptional')).toBe(true);
            expect(optional?.type?.type).toBe('intrinsic');
            checkCommentSummary(optional!, 'An optional property.');
            checkHasSources(optional!);
        });

        it('should have method with reflection type', () => {
            const method = findChild(mockObject, 'method');
            expect(method).toBeDefined();
            expect(method?.type?.type).toBe('reflection');

            const declaration = (method?.type as JSONOutput.ReflectionType).declaration;
            expect(declaration.signatures).toBeDefined();

            checkCommentSummary(method!, 'A method in the object type.');
            checkHasSources(method!);
        });
    });

    describe('Recursive Interfaces', () => {
        let mockRecursive: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockRecursive');
            if (!found) {
                throw new Error('MockRecursive not found in generated docs');
            }
            mockRecursive = found;
        });

        it('should have correct structure', () => {
            expect(mockRecursive.kind).toBe(ReflectionKind.Interface);
            checkCommentSummary(mockRecursive, 'A recursive interface.');
            checkHasSources(mockRecursive);
        });

        it('should have recursive structure in properties', () => {
            const declaration = mockRecursive;

            const nextProp = findChild(declaration, 'next');
            expect(nextProp).toBeDefined();
            expect(nextProp?.type?.type).toBe('reference');

            // Should reference itself
            const referenceType = nextProp?.type as JSONOutput.ReferenceType;
            expect(referenceType.name).toBe('MockRecursive');
        });
    });
});
