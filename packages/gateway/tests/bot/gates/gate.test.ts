import { defineGate } from '@seedcord/core';
import { describe, it, expect, expectTypeOf } from 'vitest';

import type { EventGateContext, GateContext, InteractionGateContext } from '#bot/gates';
import type { Gate } from '@seedcord/core';
import type { ButtonInteraction, Events } from 'discord.js';

function InfersPerEventRequiredContext(): void {
    const MessageGate = defineGate('msg', (ctx: EventGateContext<Events.MessageCreate>) => {
        // the messageCreate payload tuple is typed, with no eventName narrowing
        void ctx.payload;
    });

    expectTypeOf(MessageGate).toEqualTypeOf<Gate<EventGateContext<Events.MessageCreate>, 'msg'>>();
}
void InfersPerEventRequiredContext;

function InfersPerInteractionKindRequired(): void {
    const ButtonGate = defineGate('btn', (ctx: InteractionGateContext<ButtonInteraction>) => {
        // the interaction is a ButtonInteraction, with no kind narrowing
        void ctx.interaction;
    });

    expectTypeOf(ButtonGate).toEqualTypeOf<Gate<InteractionGateContext<ButtonInteraction>, 'btn'>>();
}
void InfersPerInteractionKindRequired;

describe('defineGate arm inference', () => {
    it('infers the required context from the ctx annotation', () => {
        const InteractionGate = defineGate('perms', (ctx: InteractionGateContext) => {
            // an interaction gate reaches ctx.interaction with no kind narrowing
            void ctx.interaction;
        });
        const BothGate = defineGate('owner', (ctx: GateContext) => {
            void ctx.kind;
        });

        expectTypeOf(InteractionGate).toEqualTypeOf<Gate<InteractionGateContext, 'perms'>>();
        expectTypeOf(BothGate).toEqualTypeOf<Gate<GateContext, 'owner'>>();

        expect(InteractionGate.name).toBe('perms');
    });
});
