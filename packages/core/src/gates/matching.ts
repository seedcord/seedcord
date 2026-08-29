import type { Gate, GateContextBase, RequiredOf } from './Gate';
import type { Constructor } from 'type-fest';

// type-fest's UnionToIntersection collapses a union-context gate to never
export type IntersectRequired<Gates extends readonly Gate<GateContextBase>[]> = Gates extends readonly [
    infer First extends Gate<GateContextBase>,
    ...infer Rest extends readonly Gate<GateContextBase>[]
]
    ? RequiredOf<First> & IntersectRequired<Rest>
    : unknown;

export type TwoOrMore<Item> = readonly [Item, Item, ...Item[]];

type GateName<TGate> = TGate extends Gate<GateContextBase, infer Name> ? Name : string;

// brackets keep `&` and `|` from reading as equal precedence
type Grouped<Name extends string> = Name extends `${string} & ${string}` | `${string} | ${string}` ? `(${Name})` : Name;

export type JoinNames<Gates extends readonly Gate<GateContextBase>[], Sep extends string> = Gates extends readonly [
    infer Only extends Gate<GateContextBase>
]
    ? Grouped<GateName<Only>>
    : Gates extends readonly [
            infer First extends Gate<GateContextBase>,
            ...infer Rest extends readonly Gate<GateContextBase>[]
        ]
      ? `${Grouped<GateName<First>>}${Sep}${JoinNames<Rest, Sep>}`
      : string;

type GateMismatch<
    Name extends string,
    Want extends string,
    Got extends string
> = `gate '${Name}' requires a ${Want} handler, and this handler is ${Got}`;

// without the brackets a union Provided distributes and passes on a partial fit
// TS prints a Constructor tuple inline and truncates a raw context type
export type GateFitsWith<Provided, ProvidedLabel extends string, TGate, ReqLabel extends string> = [Provided] extends [
    RequiredOf<TGate>
]
    ? TGate
    : Constructor<[GateMismatch<GateName<TGate>, ReqLabel, ProvidedLabel>]>;
