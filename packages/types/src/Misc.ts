export type AtLeastOne<Props, SingleKeyObjectMap = { [K in keyof Props]: Pick<Props, K> }> = Partial<Props> &
  SingleKeyObjectMap[keyof SingleKeyObjectMap];

export type Nullish<Value = null> = Value extends null ? null | undefined : Value | null | undefined;

export type NumberRange<
  Lower extends number,
  Upper extends number,
  Accumulator extends unknown[] = []
> = Accumulator['length'] extends Upper
  ? [...Accumulator, Accumulator['length']][number]
  : Accumulator['length'] extends Lower
    ? NumberRange<number, Upper, [...Accumulator, Accumulator['length']]>
    : NumberRange<Lower, Upper, [...Accumulator, Lower]>;

export type TupleOf<Element, Length extends number, Result extends unknown[] = []> = Result['length'] extends Length
  ? Result
  : TupleOf<Element, Length, [...Result, Element]>;

export type Without<Source, Excluded> = Partial<Record<Exclude<keyof Source, keyof Excluded>, never>>;

export type XOR<ThisObj, OtherObj> = ThisObj | OtherObj extends object
  ? (Without<ThisObj, OtherObj> & OtherObj) | (Without<OtherObj, ThisObj> & ThisObj)
  : ThisObj | OtherObj;

export type TypedOmit<TargetObj, ObjKeys extends keyof TargetObj> = Omit<TargetObj, ObjKeys>;

export type TypedExclude<Target, UnionKeys extends Target> = Exclude<Target, UnionKeys>;

export type TypedExtract<Target, UnionKeys extends Target> = Extract<Target, UnionKeys>;

export type ConstructorFunction = new (...args: any[]) => unknown;

export type StartsWith<
  BaseUnion extends string,
  StartingString extends string
> = BaseUnion extends `${StartingString}${string}` ? BaseUnion : never;

export type TypedConstructor<ConstructorType> = ConstructorType extends new (...args: infer A) => infer R
  ? new (...args: A) => R
  : ConstructorType extends abstract new (...args: infer A) => infer R
    ? new (...args: A) => R
    : never;

type UnionToIntersection<UnionType> = (UnionType extends unknown ? (x: UnionType) => void : never) extends (
  x: infer I
) => void
  ? I
  : never;

type LastOf<UnionType> =
  UnionToIntersection<UnionType extends unknown ? (x: UnionType) => 0 : never> extends (x: infer L) => 0 ? L : never;

/** Extracts every parameter _after_ the first one */
export type Tail<TArgs extends unknown[]> = TArgs extends [unknown, ...infer R] ? R : never;

export type UnionToTuple<UnionType, TupleArray extends unknown[] = []> = [UnionType] extends [never]
  ? TupleArray
  : UnionToTuple<Exclude<UnionType, LastOf<UnionType>>, [LastOf<UnionType>, ...TupleArray]>;

export type BotPermissionScope = 'manage' | 'others' | 'all' | bigint[] | 'embed';

export interface IDocument {
  _id: string;
}

export type TypeOfIDocument<Doc extends IDocument = IDocument> = Doc;
