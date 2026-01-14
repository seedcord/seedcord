import { ReflectionKind, type JSONOutput } from 'typedoc';
import { beforeAll, describe, expect, it } from 'vitest';

import {
    checkBlockTag,
    checkCommentSummary,
    checkDefaultValue,
    checkHasSources,
    findChild,
    getBlockTag,
    getSummaryText,
    hasFlag
} from './utils';
import { sharedDocs } from './utils/setup';

describe('Variable Tests', () => {
    let docs: JSONOutput.ProjectReflection;

    beforeAll(() => {
        docs = sharedDocs;
    });

    describe('mockVariable', () => {
        let mockVariable: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'mockVariable');
            if (!found) {
                throw new Error('mockVariable not found in generated docs');
            }
            mockVariable = found;
        });

        it('should have correct structure and kind', () => {
            expect(mockVariable.kind).toBe(ReflectionKind.Variable);
            expect(mockVariable.flags).toBeDefined();
            checkHasSources(mockVariable);
        });

        it('should be marked as const', () => {
            expect(hasFlag(mockVariable, 'isConst')).toBe(true);
        });

        it('should have correct type', () => {
            expect(mockVariable.type?.type).toBe('literal');
            if (mockVariable.type?.type === 'literal') {
                expect(mockVariable.type.value).toBe('mock value');
            }
        });

        it('should have default value', () => {
            checkDefaultValue(mockVariable, "'mock value'");
        });

        it('should have comprehensive comment', () => {
            expect(mockVariable.comment).toBeDefined();
            checkCommentSummary(
                mockVariable,
                'A simple mock variable for testing documentation generation.\n\nThis variable serves as a basic export for testing purposes.'
            );
        });

        it('should have @example tag', () => {
            checkBlockTag(mockVariable, '@example');
            const exampleTag = getBlockTag(mockVariable.comment, '@example');
            const exampleText = exampleTag?.content.map((c) => c.text).join('');
            expect(exampleText).toContain('mockVariable');
        });

        it('should have proper source information', () => {
            expect(mockVariable.sources).toBeDefined();
            expect(mockVariable.sources?.length).toBeGreaterThan(0);

            const source = mockVariable.sources?.[0];
            expect(source?.fileName).toBeDefined();
            expect(typeof source?.fileName).toBe('string');
            expect(source?.line).toBeGreaterThan(0);

            // Should have character position
            expect(source?.character).toBeGreaterThan(0);
        });
    });

    describe('Variable Flags and Properties', () => {
        let mockVariable: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'mockVariable');
            if (!found) {
                throw new Error('mockVariable not found in generated docs');
            }
            mockVariable = found;
        });

        it('should not have function-specific flags', () => {
            expect(hasFlag(mockVariable, 'isOptional')).toBe(false);
            expect(hasFlag(mockVariable, 'isRest')).toBe(false);
            expect(hasFlag(mockVariable, 'isStatic')).toBe(false);
            expect(hasFlag(mockVariable, 'isPublic')).toBe(false);
            expect(hasFlag(mockVariable, 'isPrivate')).toBe(false);
            expect(hasFlag(mockVariable, 'isProtected')).toBe(false);
        });

        it('should have const flag only', () => {
            const flags = mockVariable.flags;
            const flagKeys = Object.keys(flags).filter((key) => flags[key as keyof typeof flags]);
            expect(flagKeys).toContain('isConst');
        });

        it('should have no type parameters', () => {
            expect(mockVariable.typeParameters).toBeUndefined();
        });

        it('should have no signatures', () => {
            expect(mockVariable.signatures).toBeUndefined();
        });

        it('should have no children', () => {
            expect(mockVariable.children).toBeUndefined();
        });
    });

    describe('Variable Type Information', () => {
        let mockVariable: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'mockVariable');
            if (!found) {
                throw new Error('mockVariable not found in generated docs');
            }
            mockVariable = found;
        });

        it('should have literal type with correct value', () => {
            expect(mockVariable.type).toBeDefined();
            expect(mockVariable.type?.type).toBe('literal');

            const literalType = mockVariable.type as JSONOutput.LiteralType;
            expect(literalType.value).toBe('mock value');
        });

        it('should have consistent default value and type', () => {
            const defaultValue = mockVariable.defaultValue;
            const typeValue = (mockVariable.type as JSONOutput.LiteralType).value;

            // Default value includes quotes, type value doesn't
            expect(defaultValue).toBe("'mock value'");
            expect(typeValue).toBe('mock value');
        });
    });

    describe('Variable Comments and Documentation', () => {
        let mockVariable: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'mockVariable');
            if (!found) {
                throw new Error('mockVariable not found in generated docs');
            }
            mockVariable = found;
        });

        it('should have summary comment', () => {
            expect(mockVariable.comment?.summary).toBeDefined();
            expect(mockVariable.comment?.summary.length).toBeGreaterThan(0);

            const summaryText = getSummaryText(mockVariable.comment);
            expect(summaryText).toBe(
                'A simple mock variable for testing documentation generation.\n\nThis variable serves as a basic export for testing purposes.'
            );
        });

        it('should have @example block tag with usage', () => {
            const exampleTag = getBlockTag(mockVariable.comment, '@example');
            expect(exampleTag).toBeDefined();

            const exampleContent = exampleTag?.content.map((c) => c.text).join('');
            expect(exampleContent).toBeTruthy();
            expect(exampleContent).toContain('console.log');
            expect(exampleContent).toContain('mockVariable');
        });

        it('should have proper comment structure', () => {
            expect(mockVariable.comment).toBeDefined();
            expect(mockVariable.comment?.summary).toBeDefined();
            expect(mockVariable.comment?.blockTags).toBeDefined();
            expect(mockVariable.comment?.blockTags?.length).toBeGreaterThan(0);
        });

        it('should not have modifier tags', () => {
            expect(mockVariable.comment?.modifierTags).toBeUndefined();
        });
    });

    describe('Variable in Package Structure', () => {
        it('should be included in Variables group', () => {
            const variablesGroup = docs.groups?.find((g) => g.title === 'Variables');
            expect(variablesGroup).toBeDefined();
            expect(variablesGroup?.children).toBeDefined();
            expect(variablesGroup?.children?.length).toBeGreaterThan(0);

            // mockVariable should be in the variables group
            const mockVariable = findChild(docs, 'mockVariable');
            expect(variablesGroup?.children).toContain(mockVariable?.id);
        });

        it('should be in top-level children', () => {
            const childNames = docs.children?.map((c) => c.name);
            expect(childNames).toContain('mockVariable');
        });

        it('should have unique id in symbolIdMap', () => {
            const symbolIdMap = (docs as unknown as { symbolIdMap: Record<string, { qualifiedName: string }> })
                .symbolIdMap;
            const mockVariable = findChild(docs, 'mockVariable');

            expect(mockVariable?.id).toBeDefined();
            const symbolEntry = symbolIdMap[mockVariable!.id.toString()];
            expect(symbolEntry).toBeDefined();
            expect(symbolEntry?.qualifiedName).toBe('mockVariable');
        });
    });

    describe('Variable Comparison with Other Constructs', () => {
        it('should be different from functions', () => {
            const mockVariable = findChild(docs, 'mockVariable');
            const mockFunction = findChild(docs, 'mockFunction');

            expect(mockVariable?.kind).not.toBe(mockFunction?.kind);
            expect(mockVariable?.signatures).toBeUndefined();
            expect(mockFunction?.signatures).toBeDefined();
        });

        it('should be different from classes', () => {
            const mockVariable = findChild(docs, 'mockVariable');
            const mockClass = findChild(docs, 'MockClass');

            expect(mockVariable?.kind).not.toBe(mockClass?.kind);
            expect(mockVariable?.children).toBeUndefined();
            expect(mockClass?.children).toBeDefined();
        });

        it('should be different from interfaces', () => {
            const mockVariable = findChild(docs, 'mockVariable');
            const mockInterface = findChild(docs, 'MockInterface');

            expect(mockVariable?.kind).not.toBe(mockInterface?.kind);
            expect(mockVariable?.typeParameters).toBeUndefined();
            expect(mockInterface?.typeParameters).toBeDefined();
        });

        it('should be different from enums', () => {
            const mockVariable = findChild(docs, 'mockVariable');
            const mockEnum = findChild(docs, 'MockEnum');

            expect(mockVariable?.kind).not.toBe(mockEnum?.kind);
            expect(hasFlag(mockVariable!, 'isConst')).toBe(true);
            expect(hasFlag(mockEnum!, 'isConst')).toBe(false);
        });
    });
});
