import { ReflectionKind, type JSONOutput } from 'typedoc';
import { describe, it, expect, beforeAll } from 'vitest';

import {
    findChild,
    getBlockTag,
    checkCommentSummary,
    checkBlockTag,
    checkHasSources,
    checkTypeParameters,
    checkSignatureParameters,
    checkModifierTag,
    getSummaryText
} from './utils';
import { sharedDocs } from './utils/setup';

describe('Function Tests', () => {
    let docs: JSONOutput.ProjectReflection;

    beforeAll(() => {
        docs = sharedDocs;
    });

    describe('mockFunction with Overloads', () => {
        let mockFunction: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'mockFunction');
            if (!found) {
                throw new Error('mockFunction not found in generated docs');
            }
            mockFunction = found;
        });

        it('should have correct structure', () => {
            expect(mockFunction.kind).toBe(ReflectionKind.Function);
            expect(mockFunction.signatures).toBeDefined();
            expect(mockFunction.signatures?.length).toBe(3);
            checkHasSources(mockFunction);
        });

        it('should have type parameters on the first signature', () => {
            const firstSig = mockFunction.signatures?.[0] as unknown as
                | JSONOutput.DeclarationReflection
                | JSONOutput.ReferenceReflection;
            checkTypeParameters(firstSig, ['TypeT']);
        });

        it('should have first overload with generic parameter', () => {
            const firstSig = mockFunction.signatures?.[0];
            expect(firstSig).toBeDefined();

            checkSignatureParameters(firstSig!, [{ name: 'param' }]);

            // Check return type
            expect(firstSig?.type?.type).toBe('reference');
            if (firstSig?.type?.type === 'reference') {
                expect(firstSig.type.name).toBe('TypeT');
            }

            checkCommentSummary(
                firstSig!,
                'A complex mock function for testing documentation generation.\n\nThis function demonstrates function overloading, generics, and various parameter types.'
            );
        });

        it('should have second overload with string parameter', () => {
            const secondSig = mockFunction.signatures?.[1];
            expect(secondSig).toBeDefined();

            checkSignatureParameters(secondSig!, [{ name: 'param' }]);

            // Check parameter type
            const param = secondSig?.parameters?.[0];
            expect(param?.type?.type).toBe('intrinsic');
            if (param?.type?.type === 'intrinsic') {
                expect(param.type.name).toBe('string');
            }

            checkCommentSummary(secondSig!, 'Overloaded version with string parameter.');
        });

        it('should have third overload with number parameter', () => {
            const thirdSig = mockFunction.signatures?.[2];
            expect(thirdSig).toBeDefined();

            checkSignatureParameters(thirdSig!, [{ name: 'param' }]);

            // Check parameter type
            const param = thirdSig?.parameters?.[0];
            expect(param?.type?.type).toBe('intrinsic');
            if (param?.type?.type === 'intrinsic') {
                expect(param.type.name).toBe('number');
            }

            checkCommentSummary(thirdSig!, 'Overloaded version with number parameter.');
        });
    });

    describe('mockFunctionWithRest', () => {
        let mockFunctionWithRest: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'mockFunctionWithRest');
            if (!found) {
                throw new Error('mockFunctionWithRest not found in generated docs');
            }
            mockFunctionWithRest = found;
        });

        it('should have correct structure', () => {
            expect(mockFunctionWithRest.kind).toBe(ReflectionKind.Function);
            expect(mockFunctionWithRest.signatures).toBeDefined();
            expect(mockFunctionWithRest.signatures?.length).toBe(1);
            checkHasSources(mockFunctionWithRest);
        });

        it('should have parameters with optional and rest flags', () => {
            const signature = mockFunctionWithRest.signatures?.[0];
            expect(signature).toBeDefined();

            checkSignatureParameters(signature!, [
                { name: 'required' },
                { name: 'optional', optional: true },
                { name: 'rest', rest: true }
            ]);

            const restParam = signature?.parameters?.find((p) => p.name === 'rest');
            expect(restParam?.flags.isRest).toBe(true);
            expect(restParam?.type?.type).toBe('array');

            const optionalParam = signature?.parameters?.find((p) => p.name === 'optional');
            expect(optionalParam?.flags.isOptional).toBe(true);
        });

        it('should have comprehensive comments', () => {
            const signature = mockFunctionWithRest.signatures?.[0];
            checkCommentSummary(signature!, 'A function with rest parameters and optional parameters.');
        });

        it('should have parameter comments', () => {
            const signature = mockFunctionWithRest.signatures?.[0];
            expect(signature?.parameters).toBeDefined();

            // Check specific parameter documentation
            const requiredParam = signature?.parameters?.find((p) => p.name === 'required');
            expect(requiredParam).toBeDefined();
            const summary = getSummaryText(requiredParam?.comment);
            expect(summary).toContain('The required parameter.');
        });
    });

    describe('asyncMockFunction', () => {
        let asyncMockFunction: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'asyncMockFunction');
            if (!found) {
                throw new Error('asyncMockFunction not found in generated docs');
            }
            asyncMockFunction = found;
        });

        it('should have correct structure', () => {
            expect(asyncMockFunction.kind).toBe(ReflectionKind.Function);
            expect(asyncMockFunction.signatures).toBeDefined();
            expect(asyncMockFunction.signatures?.length).toBe(1);
            checkHasSources(asyncMockFunction);
        });

        it('should return Promise type', () => {
            const signature = asyncMockFunction.signatures?.[0];
            expect(signature).toBeDefined();

            expect(signature?.type?.type).toBe('reference');
            if (signature?.type?.type === 'reference') {
                expect(signature.type.name).toBe('Promise');
                expect(signature.type.typeArguments).toBeDefined();
                expect(signature.type.typeArguments?.length).toBe(1);

                const promiseArg = signature.type.typeArguments?.[0];
                expect(promiseArg?.type).toBe('intrinsic');
                if (promiseArg?.type === 'intrinsic') {
                    expect(promiseArg.name).toBe('string');
                }
            }
        });

        it('should have @internal modifier tag', () => {
            const signature = asyncMockFunction.signatures?.[0];
            checkModifierTag(signature!, '@internal');
        });

        it('should have comprehensive comments', () => {
            const signature = asyncMockFunction.signatures?.[0];
            checkCommentSummary(signature!, 'An async function.');
        });

        it('should have parameter with proper type', () => {
            const signature = asyncMockFunction.signatures?.[0];
            checkSignatureParameters(signature!, [{ name: 'value' }]);

            const param = signature?.parameters?.[0];
            expect(param?.type?.type).toBe('intrinsic');
            if (param?.type?.type === 'intrinsic') {
                expect(param.type.name).toBe('string');
            }
        });
    });

    describe('LogDecorator', () => {
        let logDecorator: JSONOutput.DeclarationReflection;

        beforeAll(() => {
            const found = findChild(docs, 'LogDecorator');
            if (!found) {
                throw new Error('LogDecorator not found in generated docs');
            }
            logDecorator = found;
        });

        it('should have correct structure', () => {
            expect(logDecorator.kind).toBe(ReflectionKind.Function);
            expect(logDecorator.signatures).toBeDefined();
            expect(logDecorator.signatures?.length).toBe(1);
            checkHasSources(logDecorator);
        });

        it('should have @decorator tag', () => {
            const signature = logDecorator.signatures?.[0];
            checkBlockTag(signature!, '@decorator');
        });

        it('should return MethodDecorator type', () => {
            const signature = logDecorator.signatures?.[0];
            expect(signature?.type?.type).toBe('reference');
            if (signature?.type?.type === 'reference') {
                expect(signature.type.name).toBe('MethodDecorator');
            }
        });

        it('should have comprehensive comments', () => {
            const signature = logDecorator.signatures?.[0];
            checkCommentSummary(signature!, 'A simple method decorator factory used for testing decorator extraction.');
        });

        it('should have no parameters', () => {
            const signature = logDecorator.signatures?.[0];
            expect(signature?.parameters).toBeUndefined();
        });
    });

    describe('Function Signatures Comments', () => {
        it('should have detailed comments for all parameters', () => {
            const mockFunction = findChild(docs, 'mockFunction');
            const firstSig = mockFunction?.signatures?.[0];

            expect(firstSig?.parameters).toBeDefined();
            for (const param of firstSig?.parameters ?? []) {
                const summary = getSummaryText(param.comment);
                expect(summary).toBeDefined();
                expect(summary?.length).toBeGreaterThan(0);
            }
        });

        it('should have @returns tags with meaningful descriptions', () => {
            const functions = ['mockFunction', 'mockFunctionWithRest', 'asyncMockFunction', 'LogDecorator'];

            for (const functionName of functions) {
                const func = findChild(docs, functionName);
                expect(func).toBeDefined();

                for (const signature of func?.signatures ?? []) {
                    const returnsTag = getBlockTag(signature.comment, '@returns');
                    if (returnsTag) {
                        const content = returnsTag.content.map((c) => c.text).join('');
                        expect(content.length).toBeGreaterThan(0);
                    }
                }
            }
        });

        it('should have @example tags with code snippets', () => {
            const functionsWithExamples = ['mockFunction', 'mockFunctionWithRest', 'LogDecorator'];

            for (const functionName of functionsWithExamples) {
                const func = findChild(docs, functionName);
                expect(func).toBeDefined();

                const hasExample = func?.signatures?.some((sig) => getBlockTag(sig.comment, '@example'));
                expect(hasExample).toBe(true);
            }
        });

        it('should have @throws tags where appropriate', () => {
            const mockFunction = findChild(docs, 'mockFunction');
            const firstSig = mockFunction?.signatures?.[0];

            checkBlockTag(firstSig!, '@throws');
            const throwsTag = getBlockTag(firstSig?.comment, '@throws');
            const content = throwsTag?.content.map((c) => c.text).join('');
            expect(content).toContain('Error');
        });

        it('should have @see tags linking to related items', () => {
            const mockFunction = findChild(docs, 'mockFunction');
            const firstSig = mockFunction?.signatures?.[0];

            checkBlockTag(firstSig!, '@see');
            const seeTag = getBlockTag(firstSig?.comment, '@see');
            const content = seeTag?.content.map((c) => c.text).join('') ?? '';
            expect(content.length).toBeGreaterThan(0);
        });

        it('should have @deprecated tags with alternatives', () => {
            const mockFunction = findChild(docs, 'mockFunction');
            const firstSig = mockFunction?.signatures?.[0];

            checkBlockTag(firstSig!, '@deprecated');
            const deprecatedTag = getBlockTag(firstSig?.comment, '@deprecated');
            const content = deprecatedTag?.content.map((c) => c.text).join('');
            expect(content).toContain('Use');
        });
    });

    describe('Function Types and External References', () => {
        it('should handle Promise types correctly', () => {
            const asyncFunc = findChild(docs, 'asyncMockFunction');
            const signature = asyncFunc?.signatures?.[0];

            expect(signature?.type?.type).toBe('reference');
            const refType = signature?.type as JSONOutput.ReferenceType;
            expect(refType.name).toBe('Promise');
            expect(refType.package).toBe('typescript'); // Built-in type
        });

        it('should handle MethodDecorator type correctly', () => {
            const decorator = findChild(docs, 'LogDecorator');
            const signature = decorator?.signatures?.[0];

            expect(signature?.type?.type).toBe('reference');
            const refType = signature?.type as JSONOutput.ReferenceType;
            expect(refType.name).toBe('MethodDecorator');
        });

        it('should handle array types in rest parameters', () => {
            const restFunc = findChild(docs, 'mockFunctionWithRest');
            const signature = restFunc?.signatures?.[0];
            const restParam = signature?.parameters?.find((p) => p.flags.isRest);

            expect(restParam?.type?.type).toBe('array');
            const arrayType = restParam?.type as JSONOutput.ArrayType;
            expect(arrayType.elementType).toBeDefined();
        });
    });
});
