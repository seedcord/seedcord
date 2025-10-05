/**
 * Makes at least one property of an object type required
 * @typeParam Props - The object type to modify
 */
export type AtLeastOne<Props, SingleKeyObjectMap = { [K in keyof Props]: Pick<Props, K> }> = Partial<Props> &
    SingleKeyObjectMap[keyof SingleKeyObjectMap];

/**
 * Makes a type nullable by adding null and undefined
 * @typeParam Value - The type to make nullable
 */
export type Nullable<Value = null> = Value extends null ? null | undefined : Value | null | undefined;

/**
 * Helper type to create a numeric range
 * @typeParam Lower - The lower bound of the range
 * @typeParam Upper - The upper bound of the range
 */
export type NumberRange<
    Lower extends number,
    Upper extends number,
    Accumulator extends unknown[] = []
> = Accumulator['length'] extends Upper
    ? [...Accumulator, Accumulator['length']][number]
    : Accumulator['length'] extends Lower
      ? NumberRange<number, Upper, [...Accumulator, Accumulator['length']]>
      : NumberRange<Lower, Upper, [...Accumulator, Lower]>;

/**
 * Creates a tuple of repeated elements with a specific length
 * @typeParam Element - The type of element to repeat in the tuple
 * @typeParam Length - The desired length of the tuple
 */
export type TupleOf<Element, Length extends number, Result extends unknown[] = []> = Result['length'] extends Length
    ? Result
    : TupleOf<Element, Length, [...Result, Element]>;

/**
 * Removes properties from Source that exist in Excluded
 * @typeParam Source - The source type to remove properties from
 * @typeParam Excluded - The type containing properties to exclude
 */
export type Without<Source, Excluded> = Partial<Record<Exclude<keyof Source, keyof Excluded>, never>>;

/**
 * Creates an exclusive OR type - allows either one type or the other, but not both
 * @typeParam ThisObj - The first type option
 * @typeParam OtherObj - The second type option
 */
export type XOR<ThisObj, OtherObj> = ThisObj | OtherObj extends object
    ? (Without<ThisObj, OtherObj> & OtherObj) | (Without<OtherObj, ThisObj> & ThisObj)
    : ThisObj | OtherObj;

/**
 * Type-safe version of Omit that ensures the keys exist on the target object
 * @typeParam TargetObj - The object type to omit properties from
 * @typeParam ObjKeys - The keys to omit from the object
 */
export type TypedOmit<TargetObj, ObjKeys extends keyof TargetObj> = Omit<TargetObj, ObjKeys>;

/**
 * Type-safe version of Exclude that ensures the excluded types are valid members
 * @typeParam Target - The union type to exclude from
 * @typeParam UnionKeys - The types to exclude from the union
 */
export type TypedExclude<Target, UnionKeys extends Target> = Exclude<Target, UnionKeys>;

/**
 * Type-safe version of Extract that ensures the extracted types are valid members
 * @typeParam Target - The union type to extract from
 * @typeParam UnionKeys - The types to extract from the union
 */
export type TypedExtract<Target, UnionKeys extends Target> = Extract<Target, UnionKeys>;

/** Represents any constructor function that can be instantiated with new */
export type ConstructorFunction = new (...args: any[]) => unknown;

/**
 * Filters string union types to only include those that start with a specific string
 * @typeParam BaseUnion - The union of strings to filter
 * @typeParam StartingString - The string that valid members must start with
 */
export type StartsWith<
    BaseUnion extends string,
    StartingString extends string
> = BaseUnion extends `${StartingString}${string}` ? BaseUnion : never;

/**
 * Extracts the constructor signature from a constructor type
 * @typeParam ConstructorType - The constructor type to extract the signature from
 */
export type TypedConstructor<ConstructorType> = ConstructorType extends new (...args: infer A) => infer R
    ? new (...args: A) => R
    : ConstructorType extends abstract new (...args: infer A) => infer R
      ? new (...args: A) => R
      : never;

/**
 * Converts a union type to an intersection type
 * @typeParam UnionType - The union type to convert to an intersection
 */
export type UnionToIntersection<UnionType> = (UnionType extends unknown ? (x: UnionType) => void : never) extends (
    x: infer I
) => void
    ? I
    : never;

/**
 * Gets the last type from a union type
 * @typeParam UnionType - The union type to get the last member from
 */
export type LastOf<UnionType> =
    UnionToIntersection<UnionType extends unknown ? (x: UnionType) => 0 : never> extends (x: infer L) => 0 ? L : never;

/**
 * Extracts all parameters after the first one from a tuple type
 * @typeParam TArgs - The tuple type to extract the tail from
 */
export type Tail<TArgs extends unknown[]> = TArgs extends [unknown, ...infer R] ? R : never;

/**
 * Converts a union type to a tuple type
 * @typeParam UnionType - The union type to convert to a tuple
 */
export type UnionToTuple<UnionType, TupleArray extends unknown[] = []> = [UnionType] extends [never]
    ? TupleArray
    : UnionToTuple<Exclude<UnionType, LastOf<UnionType>>, [LastOf<UnionType>, ...TupleArray]>;
