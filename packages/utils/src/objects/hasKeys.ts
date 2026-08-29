import type { UnionToIntersection } from 'type-fest';

/**
 * Extracts the type of a nested property, distributing over unions. {@link hasKeys} narrows through
 * this.
 */
export type DeepGet<Obj, Key extends string> = Obj extends unknown
    ? Key extends `${infer K}.${infer Rest}`
        ? K extends keyof Obj
            ? DeepGet<NonNullable<Obj[K]>, Rest>
            : never
        : Key extends keyof Obj
          ? Obj[Key]
          : never
    : never;

/**
 * Converts a dot-notation path string into a nested object type with a specific leaf value.
 * {@link hasKeys} builds its narrowed type out of these.
 */
export type PathToObj<Path extends string, Value> = Path extends `${infer Head}.${infer Tail}`
    ? { [K in Head]: PathToObj<Tail, Value> }
    : { [K in Path]: Value };

/**
 * Checks that the specified nested keys exist on a possibly distributed union object and are not null or
 * undefined, narrowing the object type to reflect those keys with their types from the original union.
 *
 * @param keys - An array of dot-notation paths to check.
 * @returns True if all keys exist and are non-null/defined, narrowing the object type.
 *
 * @example
 * ```ts
 * interface Test {
 *   a?: {
 *     b?: {
 *       c?: string;
 *     };
 *   } | null;
 *   x?: number | null;
 * }
 *
 * const obj: Test = { a: { b: { c: 'hello' } }, x: 42 };
 *
 * if (hasKeys(obj, ['a.b.c', 'x'])) {
 *   // Here, obj is narrowed to:
 *   // {
 *   //   a: { b: { c: string } };
 *   //   x: number;
 *   // }
 *   console.log(obj.a.b.c.toUpperCase());
 *   console.log(obj.x.toFixed(2));
 * }
 * ```
 */
export function hasKeys<Obj extends object, Keys extends string>(
    obj: Obj,
    keys: Keys[]
): obj is Obj &
    UnionToIntersection<
        Keys extends unknown ? PathToObj<Keys, UnionToIntersection<NonNullable<DeepGet<Obj, Keys>>>> : never
    > {
    return keys.every((key) => {
        const parts = key.split('.');
        let current: unknown = obj;

        for (const part of parts) {
            if (
                current === null ||
                current === undefined ||
                (typeof current !== 'object' && typeof current !== 'function')
            ) {
                return false;
            }
            if (!(part in current)) {
                return false;
            }
            current = (current as Record<string, unknown>)[part];
        }

        return current !== null && current !== undefined;
    });
}
