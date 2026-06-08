import type { AnyCustomId } from './CustomId';

/**
 * The route decorators store a handler's customId definitions here so the component base can decode
 * against them at runtime.
 *
 * @internal
 */
export const ComponentDefsKey = Symbol('seedcord:customId:componentDefs');

/**
 * The phantom a component handler base carries. A route decorator constrains its argument to this, so
 * passing different definitions to the decorator and the handler's generic is a compile error. It is
 * never set at runtime.
 *
 * @internal
 */
export interface HasComponentDefs<Defs extends readonly AnyCustomId[]> {
    readonly __componentDefs?: Defs;
}
