import type { Gate, GateContextBase, RequiredOf } from './Gate';
import type { Constructor } from 'type-fest';

// type-fest's UnionToIntersection collapses a union-context gate to never. this keeps each arm whole
export type IntersectRequired<Gates extends readonly Gate<GateContextBase>[]> = Gates extends readonly [
    infer First extends Gate<GateContextBase>,
    ...infer Rest extends readonly Gate<GateContextBase>[]
]
    ? RequiredOf<First> & IntersectRequired<Rest>
    : unknown;

// a combinator of one gate is just that gate, so and/or take two or more
export type TwoOrMore<Item> = readonly [Item, Item, ...Item[]];

type GateName<TGate> = TGate extends Gate<GateContextBase, infer Name> ? Name : string;

// the mismatch error names each arm
export type JoinNames<Gates extends readonly Gate<GateContextBase>[], Sep extends string> = Gates extends readonly [
    infer Only extends Gate<GateContextBase>
]
    ? GateName<Only>
    : Gates extends readonly [
            infer First extends Gate<GateContextBase>,
            ...infer Rest extends readonly Gate<GateContextBase>[]
        ]
      ? `${GateName<First>}${Sep}${JoinNames<Rest, Sep>}`
      : string;

type GateMismatch<
    Name extends string,
    Want extends string,
    Got extends string
> = `gate '${Name}' wants a ${Want} handler but this handler is ${Got}`;

// the brackets match Provided whole. a bare union would distribute and pass on a partial fit. on a mismatch
// the message goes in a Constructor tuple, which TS prints inline where a raw context type would truncate.
// the labels are pre-computed strings because each transport supplies its own kind labeler and core never
// names a kind itself
export type GateFitsWith<Provided, ProvidedLabel extends string, TGate, ReqLabel extends string> = [Provided] extends [
    RequiredOf<TGate>
]
    ? TGate
    : Constructor<[GateMismatch<GateName<TGate>, ReqLabel, ProvidedLabel>]>;
