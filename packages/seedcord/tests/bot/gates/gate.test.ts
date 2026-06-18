import { Notice } from '@seedcord/kit';
import { describe, it, expect, expectTypeOf } from 'vitest';

import { defineGate } from '@bot/gates';

import { TestNotice } from '../../utils/TestNotice';

import type { EventGateContext, Gate, GateContext, GateContextBase, InteractionGateContext } from '@bot/gates';
import type { ButtonInteraction, Events } from 'discord.js';

// the gates under test ignore ctx, so a minimal cast stands in for a live context
const ctx = { kind: 'interaction' } as unknown as GateContext;

describe('defineGate', () => {
    it('returns a named gate whose check runs', async () => {
        let ran = false;
        const Gate = defineGate('marker', () => {
            ran = true;
        });

        await Gate.check(ctx);

        expect(Gate.name).toBe('marker');
        expect(ran).toBe(true);
    });

    it('surfaces a refusal thrown from a sync check as a rejected promise', async () => {
        const Gate = defineGate('refuser', () => {
            throw new TestNotice('nope');
        });

        await expect(Gate.check(ctx)).rejects.toBeInstanceOf(Notice);
    });

    it('brands the result so a bare check function is not a Gate', () => {
        const bare = (_ctx: GateContext): void => {};
        // @ts-expect-error a bare check function lacks the Gate brand
        const notAGate: Gate = bare;

        expect(notAGate).toBe(bare);
    });

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

    it('requires only the identity base when the check reads no ctx', () => {
        const AgnosticGate = defineGate('any', () => {});
        expectTypeOf(AgnosticGate).toEqualTypeOf<Gate<GateContextBase, 'any'>>();
    });

    it('infers a per-event required context from the event annotation', () => {
        const MessageGate = defineGate('msg', (ctx: EventGateContext<Events.MessageCreate>) => {
            // the messageCreate payload tuple is typed, with no eventName narrowing
            void ctx.payload;
        });

        expectTypeOf(MessageGate).toEqualTypeOf<Gate<EventGateContext<Events.MessageCreate>, 'msg'>>();
    });

    it('infers a per-interaction-kind required context from the interaction annotation', () => {
        const ButtonGate = defineGate('btn', (ctx: InteractionGateContext<ButtonInteraction>) => {
            // the interaction is a ButtonInteraction, with no kind narrowing
            void ctx.interaction;
        });

        expectTypeOf(ButtonGate).toEqualTypeOf<Gate<InteractionGateContext<ButtonInteraction>, 'btn'>>();
    });
});
