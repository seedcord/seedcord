import { beforeAll, describe, expect, it } from 'vitest';

import { checkBlockTag, checkModifierTag, findChild, getBlockTag, getCommentText, getSummaryText } from './utils';
import { sharedDocs } from './utils/setup';

import type { JSONOutput } from 'typedoc';

describe('Comment and Tag Tests', () => {
    let docs: JSONOutput.ProjectReflection;

    beforeAll(() => {
        docs = sharedDocs;
    });

    describe('Comment Structure', () => {
        it('should have proper comment structure across all constructs', () => {
            const constructs = ['MockClass', 'MockEnum', 'MockInterface', 'mockFunction', 'mockVariable'];

            for (const constructName of constructs) {
                const construct = findChild(docs, constructName);
                expect(construct).toBeDefined();
                expect(construct?.comment).toBeDefined();
                expect(construct?.comment?.summary).toBeDefined();
                expect(Array.isArray(construct?.comment?.summary)).toBe(true);
                expect(construct?.comment?.summary.length).toBeGreaterThan(0);
            }
        });

        it('should have meaningful summary text for all documented items', () => {
            const constructs = [
                { name: 'MockClass', expectedSummary: 'Represents a complex mock class' },
                { name: 'MockEnum', expectedSummary: 'Represents a complex mock enum' },
                { name: 'MockInterface', expectedSummary: 'A complex mock interface' },
                { name: 'mockVariable', expectedSummary: 'A simple mock variable' }
            ];

            for (const { name, expectedSummary } of constructs) {
                const construct = findChild(docs, name);
                const summaryText = getSummaryText(construct?.comment);
                expect(summaryText).toContain(expectedSummary);
            }
        });

        it('should have proper content arrays in summary', () => {
            const mockClass = findChild(docs, 'MockClass');
            const summary = mockClass?.comment?.summary;

            expect(summary).toBeDefined();
            for (const part of summary ?? []) {
                expect(part).toHaveProperty('kind');
                expect(part).toHaveProperty('text');
                expect(typeof part.text).toBe('string');
            }
        });
    });

    describe('@deprecated Tags', () => {
        it('should have @deprecated in MockClass with replacement suggestion', () => {
            const mockClass = findChild(docs, 'MockClass');
            checkBlockTag(mockClass!, '@deprecated', 'Use');

            const deprecatedTag = getBlockTag(mockClass?.comment, '@deprecated');
            const content = getCommentText(deprecatedTag!.content);
            expect(content).toContain('NewMockClass');
            expect(content).toContain('Use');
        });

        it('should have @deprecated in mockFunction first overload', () => {
            const mockFunction = findChild(docs, 'mockFunction');
            const firstSig = mockFunction?.signatures?.[0];

            checkBlockTag(firstSig!, '@deprecated');

            const deprecatedTag = getBlockTag(firstSig?.comment, '@deprecated');
            const content = getCommentText(deprecatedTag!.content);
            expect(content).toContain('Use');
        });
    });

    describe('@example Tags', () => {
        it('should have @example in MockClass with code', () => {
            const mockClass = findChild(docs, 'MockClass');
            checkBlockTag(mockClass!, '@example');

            const exampleTag = getBlockTag(mockClass?.comment, '@example');
            const content = getCommentText(exampleTag!.content);
            expect(content).toContain('new MockClass');
        });

        it('should have @example in MockEnum with usage', () => {
            const mockEnum = findChild(docs, 'MockEnum');
            checkBlockTag(mockEnum!, '@example');

            const exampleTag = getBlockTag(mockEnum?.comment, '@example');
            const content = getCommentText(exampleTag!.content);
            expect(content).toContain('MockEnum.First');
        });

        it('should have @example in function signatures', () => {
            const functionsWithExamples = ['mockFunction', 'mockFunctionWithRest', 'LogDecorator'];

            for (const funcName of functionsWithExamples) {
                const func = findChild(docs, funcName);
                expect(func).toBeDefined();

                let hasExample = false;
                for (const signature of func?.signatures ?? []) {
                    const exampleTag = getBlockTag(signature.comment, '@example');
                    if (exampleTag) {
                        hasExample = true;
                        const content = getCommentText(exampleTag.content);
                        expect(content.length).toBeGreaterThan(0);
                    }
                }
                expect(hasExample).toBe(true);
            }
        });

        it('should have @example in mockVariable', () => {
            const mockVariable = findChild(docs, 'mockVariable');
            checkBlockTag(mockVariable!, '@example');

            const exampleTag = getBlockTag(mockVariable?.comment, '@example');
            const content = getCommentText(exampleTag!.content);
            expect(content).toContain('console.log');
            expect(content).toContain('mockVariable');
        });
    });

    describe('@see Tags', () => {
        it('should have @see in MockClass linking to other types', () => {
            const mockClass = findChild(docs, 'MockClass');
            checkBlockTag(mockClass!, '@see');

            const seeTag = getBlockTag(mockClass?.comment, '@see');
            const content = getCommentText(seeTag!.content);
            expect(content).toMatch(/MockEnum|MockInterface|MockType/);
        });

        it('should have @see in MockEnum linking to MockClass', () => {
            const mockEnum = findChild(docs, 'MockEnum');
            checkBlockTag(mockEnum!, '@see', 'MockClass');

            const seeTag = getBlockTag(mockEnum?.comment, '@see');
            const content = getCommentText(seeTag!.content);
            expect(content).toContain('MockClass');
        });

        it('should have @see in MockInterface linking to other constructs', () => {
            const mockInterface = findChild(docs, 'MockInterface');
            checkBlockTag(mockInterface!, '@see');

            const seeTag = getBlockTag(mockInterface?.comment, '@see');
            const content = getCommentText(seeTag!.content);
            expect(content.length).toBeGreaterThan(0);
        });

        it('should have @see in function overloads', () => {
            const mockFunction = findChild(docs, 'mockFunction');
            const firstSig = mockFunction?.signatures?.[0];
            checkBlockTag(firstSig!, '@see');
        });
    });

    describe('@param Tags', () => {
        it('should have @param tags for all method parameters', () => {
            const mockClass = findChild(docs, 'MockClass');
            const constructor = findChild(mockClass!, 'constructor');
            const constructorSig = constructor?.signatures?.[0];

            expect(constructorSig?.parameters).toBeDefined();
            expect(constructorSig?.parameters?.length).toBeGreaterThan(0);

            for (const param of constructorSig?.parameters ?? []) {
                const summary = getSummaryText(param.comment);
                expect(summary).toBeDefined();
                expect(summary?.length).toBeGreaterThan(0);
            }
        });

        it('should have @param tags for function overloads', () => {
            const mockFunction = findChild(docs, 'mockFunction');

            for (const signature of mockFunction?.signatures ?? []) {
                const paramCount = signature.parameters?.length ?? 0;

                if (paramCount > 0) {
                    for (const param of signature.parameters ?? []) {
                        const summary = getSummaryText(param.comment);
                        expect(summary).toBeDefined();
                        expect(summary?.length).toBeGreaterThan(0);
                    }
                }
            }
        });

        it('should have detailed @param descriptions', () => {
            const mockFunctionWithRest = findChild(docs, 'mockFunctionWithRest');
            const signature = mockFunctionWithRest?.signatures?.[0];

            expect(signature?.parameters?.length).toBe(3); // required, optional, rest

            for (const param of signature?.parameters ?? []) {
                const summary = getSummaryText(param.comment);
                expect(summary?.length).toBeGreaterThan(0);
                expect(summary).not.toBe(' '); // Not just whitespace
            }
        });
    });

    describe('@returns Tags', () => {
        it('should have @returns tags for methods with meaningful return types', () => {
            const methodsWithReturns = [
                { construct: 'MockClass', method: 'publicMethod' },
                { construct: 'MockClass', method: 'asyncMethod' },
                { construct: 'MockClass', method: 'restMethod' }
            ];

            for (const { construct, method } of methodsWithReturns) {
                const mockConstruct = findChild(docs, construct);
                const mockMethod = findChild(mockConstruct!, method);

                for (const signature of mockMethod?.signatures ?? []) {
                    const returnsTag = getBlockTag(signature.comment, '@returns');
                    if (returnsTag) {
                        const content = getCommentText(returnsTag.content);
                        expect(content.length).toBeGreaterThan(0);
                    }
                }
            }
        });

        it('should have @returns tags for functions', () => {
            const functions = ['mockFunction', 'mockFunctionWithRest', 'asyncMockFunction', 'LogDecorator'];

            for (const funcName of functions) {
                const func = findChild(docs, funcName);

                for (const signature of func?.signatures ?? []) {
                    const returnsTag = getBlockTag(signature.comment, '@returns');
                    if (returnsTag) {
                        const content = getCommentText(returnsTag.content);
                        expect(content.length).toBeGreaterThan(0);
                    }
                }
            }
        });

        it('should have @returns tags for accessors', () => {
            const mockClass = findChild(docs, 'MockClass');
            const computedProp = findChild(mockClass!, 'computedProp');

            if (computedProp?.getSignature) {
                checkBlockTag(computedProp.getSignature, '@returns');
            }
        });
    });

    describe('@throws Tags', () => {
        it('should have @throws in constructor', () => {
            const mockClass = findChild(docs, 'MockClass');
            const constructor = findChild(mockClass!, 'constructor');
            const constructorSig = constructor?.signatures?.[0];

            checkBlockTag(constructorSig!, '@throws');
            const throwsTag = getBlockTag(constructorSig?.comment, '@throws');
            const content = getCommentText(throwsTag!.content);
            expect(content).toContain('Error');
        });

        it('should have @throws in function overloads', () => {
            const mockFunction = findChild(docs, 'mockFunction');
            const firstSig = mockFunction?.signatures?.[0];

            checkBlockTag(firstSig!, '@throws');
            const throwsTag = getBlockTag(firstSig?.comment, '@throws');
            const content = getCommentText(throwsTag!.content);
            expect(content).toContain('TypeError');
        });
    });

    describe('@internal Modifier Tags', () => {
        it('should have @internal in asyncMockFunction', () => {
            const asyncMockFunction = findChild(docs, 'asyncMockFunction');
            const signature = asyncMockFunction?.signatures?.[0];
            checkModifierTag(signature!, '@internal');
        });

        it('should have @internal in RecursiveInterface', () => {
            const recursiveInterface = findChild(docs, 'RecursiveInterface');
            checkModifierTag(recursiveInterface!, '@internal');
        });

        it('should have @internal in protectedStaticMethod', () => {
            const mockClass = findChild(docs, 'MockClass');
            const method = findChild(mockClass!, 'protectedStaticMethod');
            const signature = method?.signatures?.[0];
            checkModifierTag(signature!, '@internal');
        });
    });

    describe('@decorator Tags', () => {
        it('should have @decorator tag in LogDecorator', () => {
            const logDecorator = findChild(docs, 'LogDecorator');
            const signature = logDecorator?.signatures?.[0];
            checkBlockTag(signature!, '@decorator');

            const decoratorTag = getBlockTag(signature?.comment, '@decorator');
            const content = getCommentText(decoratorTag!.content);
            expect(content.length).toBe(0);
        });
    });

    describe('@default Tags', () => {
        it('should have @default tags for parameters with default values', () => {
            const mockClass = findChild(docs, 'MockClass');
            const protectedStaticMethod = findChild(mockClass!, 'protectedStaticMethod');
            const signature = protectedStaticMethod?.signatures?.[0];

            const param = signature?.parameters?.find((p) => p.name === 'input');
            expect(param).toBeDefined();

            const defaultTag = param?.comment?.summary.find(
                (part) => part.kind === 'inline-tag' && part.tag === '@default'
            );
            expect(defaultTag).toBeDefined();
            expect(defaultTag?.text).toBe("''");
        });
    });

    describe('Comment Content Structure', () => {
        it('should have proper DisplayPart structure in all comments', () => {
            const mockClass = findChild(docs, 'MockClass');
            const comment = mockClass?.comment;

            for (const part of comment?.summary ?? []) {
                expect(part).toHaveProperty('kind');
                expect(part).toHaveProperty('text');
                expect(['text', 'code', 'inline-tag'].includes(part.kind)).toBe(true);
            }
        });

        it('should handle code blocks in @example tags', () => {
            const mockClass = findChild(docs, 'MockClass');
            const exampleTag = getBlockTag(mockClass?.comment, '@example');

            const hasCodeBlock = exampleTag?.content.some((part) => part.kind === 'code');
            if (hasCodeBlock) {
                const codeContent = exampleTag?.content
                    .filter((part) => part.kind === 'code')
                    .map((part) => part.text)
                    .join('');
                expect(codeContent?.length).toBeGreaterThan(0);
            }
        });

        it('should handle inline tags in comments', () => {
            const mockClass = findChild(docs, 'MockClass');
            const seeTag = getBlockTag(mockClass?.comment, '@see');

            const hasInlineTag = seeTag?.content.some((part) => part.kind === 'inline-tag');
            if (hasInlineTag) {
                const inlineTagContent = seeTag?.content
                    .filter((part) => part.kind === 'inline-tag')
                    .map((part) => part.text);
                expect(inlineTagContent?.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Comment Completeness', () => {
        it('should have comments for all public API surfaces', () => {
            const publicConstructs = ['MockClass', 'MockEnum', 'MockInterface', 'mockFunction', 'mockVariable'];

            for (const constructName of publicConstructs) {
                const construct = findChild(docs, constructName);
                expect(construct?.comment).toBeDefined();
                const summaryText = getSummaryText(construct?.comment);
                expect(summaryText).toBeTruthy();
                expect(summaryText?.length).toBeGreaterThan(0);
            }
        });

        it('should have block tags for appropriate constructs', () => {
            const expectedTags = {
                MockClass: ['@deprecated', '@example', '@see'],
                MockEnum: ['@example', '@see'],
                MockInterface: ['@example', '@see'],
                mockVariable: ['@example']
            };

            for (const [constructName, tags] of Object.entries(expectedTags)) {
                const construct = findChild(docs, constructName);
                for (const tag of tags) {
                    const blockTag = getBlockTag(construct?.comment, tag);
                    expect(blockTag).toBeDefined();
                }
            }
        });
    });
});
