import { GatedMetadataKey, InteractionRouteKeys } from '@src/metadataKeys';

import { discardCommits, runCheck, runCommits } from './effects';

import type { Gate, GateContextBase } from './Gate';

// the stable id a route decorator stored, e.g. slash:daily or button:confirm. null for a plain event handler.
export function routeIdOf(handlerCtor: object): string | null {
    for (const [kind, key] of Object.entries(InteractionRouteKeys)) {
        // justified: getMetadata returns any, this key only ever stores the route/prefix string array
        const routes = Reflect.getMetadata(key, handlerCtor) as string[] | undefined;
        if (routes?.length) return `${kind}:${routes.join(',')}`;
    }
    return null;
}

/**
 * Runs each gate's check in order, so the first refusal propagates to the dispatcher boundary. An effect
 * gate's commit runs once the whole set passes.
 */
export async function runGates(gates: readonly Gate<GateContextBase>[], ctx: GateContextBase): Promise<void> {
    try {
        for (const gate of gates) {
            await runCheck(gate, ctx);
        }
        await runCommits(ctx);
    } finally {
        discardCommits(ctx);
    }
}

// dispatchers call this before execute, inside the boundary, so a refusal renders or drops. the
// explicit routeId overrides the ctor-derived id for manifest-driven handlers with no route metadata.
export async function runHandlerGates(handlerCtor: object, ctx: GateContextBase, routeId?: string): Promise<void> {
    // justified: getMetadata returns any, and this key only ever stores the @Gated gate array
    const gates = Reflect.getMetadata(GatedMetadataKey, handlerCtor) as readonly Gate<GateContextBase>[] | undefined;
    if (!gates) return;
    await runGates(gates, { ...ctx, routeId: routeId ?? routeIdOf(handlerCtor) });
}
