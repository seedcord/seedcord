export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

export type Nullish<T = null> = T extends null ? null | undefined : T | null | undefined;

export type NumberRange<L extends number, U extends number, Acc extends unknown[] = []> = Acc['length'] extends U
  ? [...Acc, Acc['length']][number]
  : Acc['length'] extends L
    ? NumberRange<number, U, [...Acc, Acc['length']]>
    : NumberRange<L, U, [...Acc, L]>;

export type TupleOf<T, N extends number, R extends unknown[] = []> = R['length'] extends N
  ? R
  : TupleOf<T, N, [...R, T]>;

export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type TypedOmit<T, K extends keyof T> = Omit<T, K>;

export type TypedExclude<T, U extends T> = Exclude<T, U>;

export type ConstructorFunction = new (...args: any[]) => any;

export type TypedConstructor<T> = T extends new (...args: infer A) => infer R
  ? new (...args: A) => R
  : T extends abstract new (...args: infer A) => infer R
    ? new (...args: A) => R
    : never;

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type LastOf<U> = UnionToIntersection<U extends any ? (x: U) => 0 : never> extends (x: infer L) => 0 ? L : never;

export type UnionToTuple<U, T extends any[] = []> = [U] extends [never]
  ? T
  : UnionToTuple<Exclude<U, LastOf<U>>, [LastOf<U>, ...T]>;

export type BotPermissionScope = 'manage' | 'others' | 'all' | bigint[] | 'embed';

export interface IDocument {
  _id: string;
}
