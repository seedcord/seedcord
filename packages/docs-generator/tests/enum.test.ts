import { ReflectionKind, type JSONOutput } from 'typedoc';
import { describe, it, expect, beforeAll } from 'vitest';

import {
    findChild,
    getSummaryText,
    getBlockTag,
    checkCommentSummary,
    checkBlockTag,
    checkHasSources,
    checkGroups
} from './utils';
import { sharedDocs } from './utils/setup';

describe('Enum Tests', () => {
    let docs: JSONOutput.ProjectReflection;

    beforeAll(() => {
        docs = sharedDocs;
    });

    describe('MockEnum Structure', () => {
        let mockEnum: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockEnum');
            if (!found) {
                throw new Error('MockEnum not found in generated docs');
            }
            mockEnum = found;
        });

        it('should have correct kind and flags', () => {
            expect(mockEnum.kind).toBe(ReflectionKind.Enum);
            expect(mockEnum.flags).toBeDefined();
        });

        it('should have comment with summary', () => {
            expect(mockEnum.comment).toBeDefined();
            checkCommentSummary(
                mockEnum,
                'Represents a complex mock enum for testing documentation generation.\n\nThis enum demonstrates various enum features including string and numeric values,\nand mixed types.'
            );
        });

        it('should have @example tag', () => {
            checkBlockTag(mockEnum, '@example');
            const exampleTag = getBlockTag(mockEnum.comment, '@example');
            const exampleText = exampleTag?.content.map((c) => c.text).join('');
            expect(exampleText).toContain('MockEnum.First');
        });

        it('should have @see tag linking to other types', () => {
            checkBlockTag(mockEnum, '@see', 'MockClass');
            const seeTag = getBlockTag(mockEnum.comment, '@see');
            const seeText = seeTag?.content.map((c) => c.text).join('');
            expect(seeText).toContain('MockClass');
        });

        it('should have sources information', () => {
            checkHasSources(mockEnum);
        });

        it('should have groups for enumeration members', () => {
            checkGroups(mockEnum, ['Enumeration Members']);
        });

        it('should have all enum members as children', () => {
            expect(mockEnum.children).toBeDefined();
            expect(mockEnum.children?.length).toBe(5); // First, Second, Third, Fourth, Fifth

            const memberNames = mockEnum.children?.map((c) => c.name);
            expect(memberNames).toContain('First');
            expect(memberNames).toContain('Second');
            expect(memberNames).toContain('Third');
            expect(memberNames).toContain('Fourth');
            expect(memberNames).toContain('Fifth');
        });
    });

    describe('MockEnum Members', () => {
        let mockEnum: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockEnum');
            if (!found) {
                throw new Error('MockEnum not found in generated docs');
            }
            mockEnum = found;
        });

        it('should have First member with default value', () => {
            const first = findChild(mockEnum, 'First');
            expect(first).toBeDefined();
            expect(first?.kind).toBe(ReflectionKind.EnumMember);
            expect(first?.type?.type).toBe('literal');

            if (first?.type?.type === 'literal') {
                expect(first.type.value).toBe(0); // Default enum value
            }

            checkCommentSummary(first!, 'The first enum member with default value.');
            checkHasSources(first!);
        });

        it('should have Second member with explicit numeric value', () => {
            const second = findChild(mockEnum, 'Second');
            expect(second).toBeDefined();
            expect(second?.kind).toBe(ReflectionKind.EnumMember);
            expect(second?.type?.type).toBe('literal');

            if (second?.type?.type === 'literal') {
                expect(second.type.value).toBe(10);
            }

            checkCommentSummary(second!, 'The second enum member with explicit value.');
            checkHasSources(second!);
        });

        it('should have Third member with string value', () => {
            const third = findChild(mockEnum, 'Third');
            expect(third).toBeDefined();
            expect(third?.kind).toBe(ReflectionKind.EnumMember);
            expect(third?.type?.type).toBe('literal');

            if (third?.type?.type === 'literal') {
                expect(third.type.value).toBe('third');
            }

            checkCommentSummary(third!, 'A string enum member.');
            checkHasSources(third!);
        });

        it('should have Fourth member with string value', () => {
            const fourth = findChild(mockEnum, 'Fourth');
            expect(fourth).toBeDefined();
            expect(fourth?.kind).toBe(ReflectionKind.EnumMember);
            expect(fourth?.type?.type).toBe('literal');

            if (fourth?.type?.type === 'literal') {
                expect(fourth.type.value).toBe('fourth');
            }

            checkCommentSummary(fourth!, 'Another string enum member.');
            checkHasSources(fourth!);
        });

        it('should have Fifth member with computed value', () => {
            const fifth = findChild(mockEnum, 'Fifth');
            expect(fifth).toBeDefined();
            expect(fifth?.kind).toBe(ReflectionKind.EnumMember);
            expect(fifth?.type?.type).toBe('literal');

            if (fifth?.type?.type === 'literal') {
                expect(fifth.type.value).toBe(20); // Computed as Second * 2
            }

            checkCommentSummary(fifth!, 'A computed enum member.');
            checkHasSources(fifth!);
        });
    });

    describe('MockEnum Member Comments and Tags', () => {
        let mockEnum: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'MockEnum');
            if (!found) {
                throw new Error('MockEnum not found in generated docs');
            }
            mockEnum = found;
        });

        it('should have member comments with proper structure', () => {
            const first = findChild(mockEnum, 'First');
            expect(first?.comment).toBeDefined();
            expect(first?.comment?.summary).toBeDefined();
            expect(getSummaryText(first?.comment)).toBeTruthy();
        });

        it('should have sources for all members', () => {
            const members = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];

            for (const memberName of members) {
                const member = findChild(mockEnum, memberName);
                expect(member).toBeDefined();
                checkHasSources(member!);
            }
        });

        it('should have proper enum member kinds', () => {
            const members = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];

            for (const memberName of members) {
                const member = findChild(mockEnum, memberName);
                expect(member).toBeDefined();
                expect(member?.kind).toBe(ReflectionKind.EnumMember);
            }
        });
    });
});
