import 'reflect-metadata';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { decodeFor } from './CustomId';

import type { AnyCustomId } from './CustomId';
import type { DecodedParams } from './Field';
import type { Promisable } from 'type-fest';

/**
 * route decorators store a handler's customId defs here, so the component base can decode
 * against them at runtime.
 *
 * @internal
 */
export const ComponentDefsKey = Symbol('seedcord:customId:componentDefs');

/**
 * the phantom a component handler base carries. a route decorator constrains its argument to this, so
 * passing different defs to the decorator and the handler's generic is a compile error. never set at runtime.
 *
 * @internal
 */
export interface HasComponentDefs<Defs extends readonly AnyCustomId[]> {
    /** @internal */
    readonly __componentDefs?: Defs;
}

/** @internal */
export interface DecodedComponentRoute {
    prefix: string;
    params: Record<string, unknown>;
}

/**
 * throws `CustomIdHandlerRouteMissing` when the class has no stored defs. a drifted or corrupt wire
 * throws `StaleCustomId` or `InvalidCustomId`.
 *
 * @internal
 */
export function decodeComponentRoute(handlerClass: { name: string }, wire: string): DecodedComponentRoute {
    const defs = Reflect.getMetadata(ComponentDefsKey, handlerClass) as readonly AnyCustomId[] | undefined;
    if (!defs) throw new SeedcordError(SeedcordErrorCode.CustomIdHandlerRouteMissing, [handlerClass.name]);
    return decodeFor(defs, wire);
}

/** @internal */
export type SingleParams<Defs extends readonly AnyCustomId[]> = Defs extends readonly [infer One extends AnyCustomId]
    ? DecodedParams<One['shape']>
    : never;

/** @internal */
export type MatchArms<Defs extends readonly AnyCustomId[], Ret> = {
    [Def in Defs[number] as Def['prefix']]: (params: DecodedParams<Def['shape']>) => Promisable<Ret>;
};
