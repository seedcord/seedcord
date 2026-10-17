import { CustomId, defineGate } from '@seedcord/core';
import { expectTypeOf } from 'vite-plus/test';

import { Gated } from '#bDecorators/Gated';
import { ButtonHandler } from '#handlers/interaction/components/ButtonHandler';

import type { EventGateContext, InteractionGateContext } from '#src/bot/gates/Gate';
import type { GateContextBase } from '@seedcord/core';

// what a bot writes to put its own keys on the bag, naming its transport package instead
declare module '@seedcord/types' {
    interface DispatchState {
        actor: string;
    }
}

const ProbeId = new CustomId('dispatchstateprobe');

// an agnostic gate, no ctx annotation. it still reads the bag
const NeedsActor = defineGate('NeedsActor', (ctx) => {
    void ctx.dispatch.require('actor');
});

@Gated(NeedsActor)
class ProbeButton extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

declare const interactionCtx: InteractionGateContext;
declare const eventCtx: EventGateContext;
declare const agnosticCtx: GateContextBase;

// compile-only. tc is the assertion.
function typeChecks(): void {
    expectTypeOf(interactionCtx.dispatch.get('actor')).toEqualTypeOf<string | undefined>();
    expectTypeOf(eventCtx.dispatch.get('actor')).toEqualTypeOf<string | undefined>();
    expectTypeOf(agnosticCtx.dispatch.require('actor')).toEqualTypeOf<string>();
    expectTypeOf(agnosticCtx.dispatch.routeId).toEqualTypeOf<string>();
}

// no-unused-vars does not count a name used only in a type position
void [ProbeId, NeedsActor, ProbeButton, typeChecks];
