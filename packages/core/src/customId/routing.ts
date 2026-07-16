import type { AnyCustomId } from './CustomId';
import type { DecodedParams } from './Field';
import type { Promisable } from 'type-fest';

/**
 * The route decorators store a handler's customId definitions here so the component base can decode
 * against them at runtime.
 *
 * @internal
 */
export const ComponentDefsKey = Symbol('seedcord:customId:componentDefs');

/**
 * The phantom a component handler base carries. A route decorator constrains its argument to this, so
 * passing different definitions to the decorator and the handler's generic is a compile error. Never set at runtime.
 *
 * @internal
 */
export interface HasComponentDefs<Defs extends readonly AnyCustomId[]> {
    /** @internal */
    readonly __componentDefs?: Defs;
}

/** @internal */
export type SingleParams<Defs extends readonly AnyCustomId[]> = Defs extends readonly [infer One extends AnyCustomId]
    ? DecodedParams<One['shape']>
    : never;

/** @internal */
export type MatchArms<Defs extends readonly AnyCustomId[], Ret> = {
    [Def in Defs[number] as Def['prefix']]: (params: DecodedParams<Def['shape']>) => Promisable<Ret>;
};
