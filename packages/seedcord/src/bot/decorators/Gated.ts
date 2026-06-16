import { runGates } from '@bot/gates/runGates';

import type { Gate, GateContext, GateContextBase } from '@bot/gates';
import type { AnyHandlerCtor, FitAll } from '@bot/gates/matching';
import type { NonEmptyTuple } from 'type-fest';

/** @internal */
export const GatedMetadataKey = Symbol('gated:metadata');

/**
 * Attaches gates to a handler. The gates run before `execute`, and a gate refusing stops the handler with
 * the reply or drop the gate threw. A gate that requires a context the handler does not provide (a button
 * gate on a slash handler, an interaction gate on an event handler) is a compile error at this line.
 */
export function Gated<const Gates extends NonEmptyTuple<Gate<GateContextBase>>>(...gates: Gates) {
    // mismatch resolves to the error tuple instead of TCtor, so the class fails to assign and TS names the gate
    return function <TCtor extends AnyHandlerCtor>(
        ctor: FitAll<TCtor, Gates> extends Gates ? TCtor : FitAll<TCtor, Gates>
    ): void {
        const existing = (Reflect.getMetadata(GatedMetadataKey, ctor) as readonly Gate[] | undefined) ?? [];
        Reflect.defineMetadata(GatedMetadataKey, [...existing, ...gates], ctor);
    };
}

/**
 * Runs the gates a handler was decorated with against the given context. The dispatcher calls this before
 * `execute`, inside the boundary, so a refusal renders or drops.
 */
export async function runHandlerGates(handlerCtor: object, ctx: GateContext): Promise<void> {
    const gates = Reflect.getMetadata(GatedMetadataKey, handlerCtor) as readonly Gate<GateContextBase>[] | undefined;
    if (!gates) return;
    await runGates(gates, ctx);
}
