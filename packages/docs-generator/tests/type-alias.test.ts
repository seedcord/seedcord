import { ReflectionKind, type JSONOutput } from 'typedoc';
import { beforeAll, describe, expect, it } from 'vitest';

import {
    checkCommentSummary,
    checkHasSources,
    checkTypeParameters,
    findChild,
    checkSignatureParameters
} from './utils';
import { sharedDocs } from './utils/setup';

describe('Type Alias Tests', () => {
    let docs: JSONOutput.ProjectReflection;

    beforeAll(() => {
        docs = sharedDocs;
    });

    describe('Union Types', () => {
        let mockUnion: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockUnion');
            if (!found) {
                throw new Error('MockUnion not found in generated docs');
            }
            mockUnion = found;
        });

        it('should have correct structure', () => {
            expect(mockUnion.kind).toBe(ReflectionKind.TypeAlias);
            expect(mockUnion.type?.type).toBe('union');
            checkCommentSummary(mockUnion, 'A union type.');
            checkHasSources(mockUnion);
        });

        it('should have all union members', () => {
            const unionType = mockUnion.type as JSONOutput.UnionType;
            expect(unionType.types).toHaveLength(3);

            const typeStrings = unionType.types.map((type) => {
                if (type.type === 'intrinsic') {
                    return type.name;
                } else if (type.type === 'literal') {
                    // eslint-disable-next-line @typescript-eslint/no-base-to-string
                    return `literal:${type.value?.toString()}`;
                }
                return type.type;
            });

            expect(typeStrings).toContain('string');
            expect(typeStrings).toContain('number');
            expect(typeStrings).toContain('boolean');
        });
    });

    describe('Intersection Types', () => {
        let mockIntersection: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockIntersection');
            if (!found) {
                throw new Error('MockIntersection not found in generated docs');
            }
            mockIntersection = found;
        });

        it('should have correct structure', () => {
            expect(mockIntersection.kind).toBe(ReflectionKind.TypeAlias);
            expect(mockIntersection.type?.type).toBe('intersection');
            checkCommentSummary(mockIntersection, 'An intersection type.');
            checkHasSources(mockIntersection);
        });

        it('should have intersection members with reflection types', () => {
            const intersectionType = mockIntersection.type as JSONOutput.IntersectionType;
            expect(intersectionType.types).toHaveLength(2);

            // Check that both types are reflection types (inline object types)
            for (const type of intersectionType.types) {
                expect(type.type).toBe('reflection');

                const reflectionType = type as JSONOutput.ReflectionType;
                expect(reflectionType.declaration).toBeDefined();
                expect(reflectionType.declaration.children).toBeDefined();
            }
        });
    });

    describe('Literal Types', () => {
        let mockLiteral: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockLiteral');
            if (!found) {
                throw new Error('MockLiteral not found in generated docs');
            }
            mockLiteral = found;
        });

        it('should have correct structure', () => {
            expect(mockLiteral.kind).toBe(ReflectionKind.TypeAlias);
            expect(mockLiteral.type?.type).toBe('union');
            checkCommentSummary(mockLiteral, 'A literal type.');
            checkHasSources(mockLiteral);
        });

        it('should contain literal values', () => {
            const unionType = mockLiteral.type as JSONOutput.UnionType;
            expect(unionType.types.length).toBeGreaterThan(0);

            // Check that some types are literals
            const hasLiterals = unionType.types.some((type) => type.type === 'literal');
            expect(hasLiterals).toBe(true);
        });
    });

    describe('Tuple Types', () => {
        let mockTuple: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockTuple');
            if (!found) {
                throw new Error('MockTuple not found in generated docs');
            }
            mockTuple = found;
        });

        it('should have correct structure', () => {
            expect(mockTuple.kind).toBe(ReflectionKind.TypeAlias);
            expect(mockTuple.type?.type).toBe('tuple');
            checkCommentSummary(mockTuple, 'A tuple type.');
            checkHasSources(mockTuple);
        });

        it('should have tuple elements', () => {
            const tupleType = mockTuple.type as JSONOutput.TupleType;
            expect(tupleType.elements).toHaveLength(3);

            // Check element types
            expect(tupleType.elements?.[0]?.type).toBe('intrinsic');
            expect(tupleType.elements?.[1]?.type).toBe('intrinsic');
            expect(tupleType.elements?.[2]?.type).toBe('intrinsic');
        });
    });

    describe('Mapped Types', () => {
        let mockMapped: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockMapped');
            if (!found) {
                throw new Error('MockMapped not found in generated docs');
            }
            mockMapped = found;
        });

        it('should have correct structure', () => {
            expect(mockMapped.kind).toBe(ReflectionKind.TypeAlias);
            checkCommentSummary(mockMapped, 'A mapped type.');
            checkHasSources(mockMapped);
        });

        it('should have type parameters', () => {
            checkTypeParameters(mockMapped, ['TypeT']);
        });

        it('should have mapped type structure', () => {
            expect(mockMapped.type?.type).toBe('mapped');
        });
    });

    describe('Conditional Types', () => {
        let mockConditional: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockConditional');
            if (!found) {
                throw new Error('MockConditional not found in generated docs');
            }
            mockConditional = found;
        });

        it('should have correct structure', () => {
            expect(mockConditional.kind).toBe(ReflectionKind.TypeAlias);
            checkCommentSummary(mockConditional, 'A conditional type.');
            checkHasSources(mockConditional);
        });

        it('should have type parameters', () => {
            checkTypeParameters(mockConditional, ['TypeT']);
        });

        it('should have conditional type structure', () => {
            expect(mockConditional.type?.type).toBe('conditional');
        });
    });

    describe('Template Literal Types', () => {
        let mockTemplate: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockTemplate');
            if (!found) {
                throw new Error('MockTemplate not found in generated docs');
            }
            mockTemplate = found;
        });

        it('should have correct structure', () => {
            expect(mockTemplate.kind).toBe(ReflectionKind.TypeAlias);
            expect(mockTemplate.type?.type).toBe('templateLiteral');
            checkCommentSummary(mockTemplate, 'A template literal type.');
            checkHasSources(mockTemplate);
        });

        it('should have template literal components', () => {
            const templateType = mockTemplate.type as JSONOutput.TemplateLiteralType;
            expect(templateType.head).toBeDefined();
            expect(templateType.tail).toBeDefined();
            expect(templateType.tail.length).toBeGreaterThan(0);
        });
    });

    describe('Indexed Access Types', () => {
        let mockIndexed: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockIndexed');
            if (!found) {
                throw new Error('MockIndexed not found in generated docs');
            }
            mockIndexed = found;
        });

        it('should have correct structure', () => {
            expect(mockIndexed.kind).toBe(ReflectionKind.TypeAlias);
            expect(mockIndexed.type?.type).toBe('indexedAccess');
            checkCommentSummary(mockIndexed, 'An indexed access type.');
            checkHasSources(mockIndexed);
        });

        it('should have indexed access components', () => {
            const indexedType = mockIndexed.type as JSONOutput.IndexedAccessType;
            expect(indexedType.objectType).toBeDefined();
            expect(indexedType.indexType).toBeDefined();
        });
    });

    describe('KeyOf Types', () => {
        let mockKeyOf: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockKeyOf');
            if (!found) {
                throw new Error('MockKeyOf not found in generated docs');
            }
            mockKeyOf = found;
        });

        it('should have correct structure', () => {
            expect(mockKeyOf.kind).toBe(ReflectionKind.TypeAlias);
            expect(mockKeyOf.type?.type).toBe('typeOperator');
            checkCommentSummary(mockKeyOf, 'A keyof type.');
            checkHasSources(mockKeyOf);
        });

        it('should have keyof operator', () => {
            const operatorType = mockKeyOf.type as JSONOutput.TypeOperatorType;
            expect(operatorType.operator).toBe('keyof');
            expect(operatorType.target).toBeDefined();
        });
    });

    describe('Constrained Types', () => {
        let mockConstrained: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockConstrained');
            if (!found) {
                throw new Error('MockConstrained not found in generated docs');
            }
            mockConstrained = found;
        });

        it('should have correct structure', () => {
            expect(mockConstrained.kind).toBe(ReflectionKind.TypeAlias);
            checkCommentSummary(mockConstrained, 'A type with constraints.');
            checkHasSources(mockConstrained);
        });

        it('should have constrained type parameters', () => {
            checkTypeParameters(mockConstrained, ['TypeT']);

            const typeParam = mockConstrained.typeParameters?.find((tp) => tp.name === 'TypeT');
            expect(typeParam?.type).toBeDefined();
            expect(typeParam?.type?.type).toBe('reflection');
        });
    });

    describe('Utility Types', () => {
        it('should handle Readonly utility type', () => {
            const mockReadonly = findChild(docs, 'MockReadonly');
            expect(mockReadonly).toBeDefined();
            expect(mockReadonly?.kind).toBe(ReflectionKind.TypeAlias);
            checkCommentSummary(mockReadonly!, 'A type with readonly modifier.');

            // TypeDoc expands Readonly or keeps it as reference
            expect(mockReadonly?.type?.type).toBe('reference');
            const ref = mockReadonly?.type as JSONOutput.ReferenceType;
            expect(ref.name).toBe('Readonly');
            expect(ref.typeArguments).toBeDefined();
            expect(ref.typeArguments?.length).toBe(1);
        });

        it('should handle Partial utility type', () => {
            const mockPartial = findChild(docs, 'MockPartial');
            expect(mockPartial).toBeDefined();
            expect(mockPartial?.kind).toBe(ReflectionKind.TypeAlias);
            checkCommentSummary(mockPartial!, 'A type using utility types.');

            expect(mockPartial?.type?.type).toBe('reference');
            const ref = mockPartial?.type as JSONOutput.ReferenceType;
            expect(ref.name).toBe('Partial');
            expect(ref.typeArguments).toBeDefined();
            expect(ref.typeArguments?.length).toBe(1);
            expect((ref.typeArguments?.[0] as JSONOutput.ReferenceType).name).toBe('MockObject');
        });
    });

    describe('Function Type Alias', () => {
        it('should handle function type alias', () => {
            const mockFunctionType = findChild(docs, 'MockFunctionType');
            expect(mockFunctionType).toBeDefined();
            expect(mockFunctionType?.kind).toBe(ReflectionKind.TypeAlias);
            checkCommentSummary(mockFunctionType!, 'A type alias for a function.');

            expect(mockFunctionType?.type?.type).toBe('reflection');
            const declaration = (mockFunctionType?.type as JSONOutput.ReflectionType).declaration;
            expect(declaration).toBeDefined();
            expect(declaration.signatures).toBeDefined();
            expect(declaration.signatures?.length).toBe(1);

            checkSignatureParameters(declaration.signatures![0]!, [{ name: 'param' }]);
        });
    });
});
