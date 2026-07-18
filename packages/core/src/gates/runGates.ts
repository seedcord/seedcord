import 'reflect-metadata';

import { GatedMetadataKey, InteractionRouteKeys } from '@src/metadataKeys';

import { discardCommits, runCheck, runCommits } from './effects';

import type { Gate, GateContextBase } from './Gate';

/**
 * Receives each gate's name and how long its check ran, in ms. A combinator (`and`/`or`) reports once
 * under its joined name.
 */
export type GateObserver = (gateName: string, elapsedMs: number) => void;

// the stable id a route decorator stored, e.g. slash:daily or button:confirm. null for a plain event handler.
export function routeIdOf(handlerCtor: object): string | null {
    for (const [kind, key] of Object.entries(InteractionRouteKeys)) {
        // justified: getMetadata returns any, this key only ever stores the route/prefix string array
        const routes = Reflect.getMetadata(key, handlerCtor) as string[] | undefined;
        if (routes?.length) return `${kind}:${routes.join(',')}`;
    }
    return null;
}

async function timedCheck(gate: Gate<GateContextBase>, ctx: GateContextBase, observe: GateObserver): Promise<void> {
    const start = performance.now();
    // finally so a refusing gate still reports
    try {
        await runCheck(gate, ctx);
    } finally {
        observe(gate.name, performance.now() - start);
    }
}

/**
 * Runs each gate's check in order, so the first refusal propagates to the dispatcher boundary. An effect
 * gate's commit runs once the whole set passes. When `observe` is given, each check is timed and reported,
 * commits excluded.
 */
export async function runGates(
    gates: readonly Gate<GateContextBase>[],
    ctx: GateContextBase,
    observe?: GateObserver
): Promise<void> {
    try {
        for (const gate of gates) {
            await (observe ? timedCheck(gate, ctx, observe) : runCheck(gate, ctx));
        }
        await runCommits(ctx);
    } finally {
        discardCommits(ctx);
    }
}

// dispatchers call this before execute, inside the boundary, so a refusal renders or drops. the
// explicit routeId overrides the ctor-derived id for manifest-driven handlers with no route metadata.
export async function runHandlerGates(
    handlerCtor: object,
    ctx: GateContextBase,
    routeId?: string,
    observe?: GateObserver
): Promise<void> {
    // justified: getMetadata returns any, and this key only ever stores the @Gated gate array
    const gates = Reflect.getMetadata(GatedMetadataKey, handlerCtor) as readonly Gate<GateContextBase>[] | undefined;
    if (!gates) return;
    await runGates(gates, { ...ctx, routeId: routeId ?? routeIdOf(handlerCtor) }, observe);
}
