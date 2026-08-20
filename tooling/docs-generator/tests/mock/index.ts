/**
 * Mock entities for testing documentation generation.
 *
 * This module exports various TypeScript entities with complex TSDoc comments
 * to test the docs-generator functionality.
 *
 * @packageDocumentation
 */

export {
    BaseClass,
    InlineConstraintBase,
    InlineConstraintCallable,
    InlineConstraintChild,
    InlineConstraintShadow
} from './class.js';
// eslint-disable-next-line @typescript-eslint/no-deprecated -- deprecated on purpose, the fixture tests deprecation rendering
export { MockClass } from './class.js';
export { MockEnum } from './enum.js';
// eslint-disable-next-line @typescript-eslint/no-deprecated -- deprecated on purpose, the fixture tests deprecation rendering
export { mockFunction, mockFunctionWithRest, asyncMockFunction, LogDecorator, usesPromoted } from './function.js';
export type { MockInterface, RecursiveInterface, IndexableInterface, ExtendedInterface } from './interface.js';
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
} from './type.js';
export { mockVariable } from './variable.js';
