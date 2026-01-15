/**
 * Mock entities for testing documentation generation.
 *
 * This module exports various TypeScript entities with complex TSDoc comments
 * to test the docs-generator functionality.
 *
 * @packageDocumentation
 */

export { BaseClass, MockClass } from './class';
export { MockEnum } from './enum';
export { mockFunction, mockFunctionWithRest, asyncMockFunction, LogDecorator } from './function';
export type { MockInterface, RecursiveInterface, IndexableInterface, ExtendedInterface } from './interface';
export type {
    MockUnion,
    MockIntersection,
    MockLiteral,
    MockTuple,
    MockMapped,
    MockConditional,
    MockRecursive,
    MockTemplate,
    MockIndexed,
    MockKeyOf,
    MockConstrained,
    MockObject,
    MockFunctionType,
    MockReadonly,
    MockPartial
} from './type';
export { mockVariable } from './variable';
