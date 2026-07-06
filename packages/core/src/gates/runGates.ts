import { GatedMetadataKey } from '@src/metadataKeys';

import { discardCommits, runCheck, runCommits } from './effects';

import type { Gate, GateContextBase } from './Gate';

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

/**
 * Runs the gates a handler was decorated with against the given context. The dispatcher calls this before
 * `execute`, inside the boundary, so a refusal renders or drops.
 *
 * @param handlerCtor - The handler class whose attached gates are read from metadata.
 * @param ctx - The context passed to each gate, supplying what the gate checks against.
 */
export async function runHandlerGates(handlerCtor: object, ctx: GateContextBase): Promise<void> {
    // justified: getMetadata returns any, and this key only ever stores the @Gated gate array
    const gates = Reflect.getMetadata(GatedMetadataKey, handlerCtor) as readonly Gate<GateContextBase>[] | undefined;
    if (!gates) return;
    await runGates(gates, ctx);
}
