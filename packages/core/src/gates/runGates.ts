import 'reflect-metadata';

import { MemberValues } from '#src/dispatch/DispatchContext';
import { GatedMetadataKey } from '#src/metadataKeys';

import { discardCommits, runCheck, runCommits } from './effects';
import { slowGateMonitor } from './slowGate';

import type { Gate, GateContextBase } from './Gate';

// a combinator (`and`/`or`) reports once under its joined name.
export type GateObserver = (gateName: string, elapsedMs: number) => void;

async function timedCheck(gate: Gate<GateContextBase>, ctx: GateContextBase, observe: GateObserver): Promise<void> {
    const start = performance.now();
    // finally so a refusing gate still reports
    try {
        await runCheck(gate, ctx);
    } finally {
        observe(gate.name, performance.now() - start);
    }
}

// the first refusal throws out to the dispatcher boundary. an effect gate's commit runs once the
// whole set passes, and observe never times the commit phase.
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

// dispatchers call this before execute, inside the boundary, to let the boundary render a refusal
export async function runHandlerGates(
    handlerCtor: object,
    ctx: GateContextBase,
    observe?: GateObserver
): Promise<void> {
    // justified: getMetadata returns any, and this key only ever stores the @Gated gate array
    const gates = Reflect.getMetadata(GatedMetadataKey, handlerCtor) as readonly Gate<GateContextBase>[] | undefined;
    if (!gates) return;
    await runGates(gates, { ...ctx, ...ctx.dispatch[MemberValues] }, observe);
}

// discord rejects a response to an interaction that isn't acked within 3s
export async function runInteractionGates(handlerCtor: object, ctx: GateContextBase): Promise<void> {
    const monitor = slowGateMonitor();
    try {
        await runHandlerGates(handlerCtor, ctx, monitor?.observe);
    } finally {
        // a refusing gate spent budget too
        monitor?.report(ctx.dispatch.declaredRoute);
    }
}
