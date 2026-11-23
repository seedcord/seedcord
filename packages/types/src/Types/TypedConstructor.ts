import type { Constructor } from 'type-fest';

/**
 * Extracts the constructor signature from a constructor type. `typeof` on an abstract class gives an
 * `abstract new (...)` signature that TypeScript refuses to assign to a plain `new (...)`, and this
 * removes the modifier so both kinds of class reference resolve to the same newable shape.
 * @typeParam ConstructorType - The constructor type to extract the signature from
 *
 * @example
 * ```ts
 * class Example {
 *   constructor(public name: string, public age: number) {}
 * }
 *
 * type Result = TypedConstructor<typeof Example>; // Result: new (name: string, age: number) => Example
 * ```
 */
export type TypedConstructor<ConstructorType extends abstract new (...args: never[]) => unknown> = Constructor<
    InstanceType<ConstructorType>,
    ConstructorParameters<ConstructorType>
>;
