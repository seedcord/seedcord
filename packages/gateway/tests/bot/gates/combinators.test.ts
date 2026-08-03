import { and, defineGate, or } from '@seedcord/core';
import { describe, it, expect, expectTypeOf } from 'vitest';

import type { EventGateContext, GateContext, InteractionGateContext } from '@bot/gates';
import type { EffectGate, Gate, GateContextBase, RequiredOf } from '@seedcord/core';
import type { ButtonInteraction, ChatInputCommandInteraction, Events } from 'discord.js';

const ButtonGate = defineGate('btn', (c: InteractionGateContext<ButtonInteraction>) => {
    void c.interaction;
});
const SlashGate = defineGate('slash', (c: InteractionGateContext<ChatInputCommandInteraction>) => {
    void c.interaction;
});
const AgnosticGate = defineGate('any', () => {});
const MessageGate = defineGate('msg', (c: EventGateContext<Events.MessageCreate>) => {
    void c.payload;
});
const MemberGate = defineGate('mem', (c: EventGateContext<Events.GuildMemberAdd>) => {
    void c.payload;
});
// fixture: defineGate makes a plain Gate, so cast to add the EffectGate shape (only the type is read here)
const EffectButtonGate = defineGate('eff', (c: InteractionGateContext<ButtonInteraction>) => {
    void c.interaction;
}) as unknown as EffectGate<InteractionGateContext<ButtonInteraction>, 'eff'>;

describe('combinator result types on the gateway arms', () => {
    it('or unions two interaction arms', () => {
        expectTypeOf(or(ButtonGate, SlashGate)).toEqualTypeOf<
            Gate<
                InteractionGateContext<ButtonInteraction> | InteractionGateContext<ChatInputCommandInteraction>,
                'btn | slash'
            >
        >();
    });

    it('or unions an interaction arm and an event arm', () => {
        expectTypeOf(or(ButtonGate, MessageGate)).toEqualTypeOf<
            Gate<InteractionGateContext<ButtonInteraction> | EventGateContext<Events.MessageCreate>, 'btn | msg'>
        >();
    });

    it('or unions two distinct event arms', () => {
        expectTypeOf(or(MessageGate, MemberGate)).toEqualTypeOf<
            Gate<EventGateContext<Events.MessageCreate> | EventGateContext<Events.GuildMemberAdd>, 'msg | mem'>
        >();
    });

    it('and of an interaction and an event arm is uninhabitable', () => {
        expectTypeOf(and(ButtonGate, MessageGate)).toEqualTypeOf<
            Gate<
                InteractionGateContext<ButtonInteraction> & EventGateContext<Events.MessageCreate> & GateContextBase,
                'btn & msg'
            >
        >();
    });

    it('and of two disjoint interaction kinds is uninhabitable', () => {
        expectTypeOf(and(ButtonGate, SlashGate)).toEqualTypeOf<
            Gate<
                InteractionGateContext<ButtonInteraction> &
                    InteractionGateContext<ChatInputCommandInteraction> &
                    GateContextBase,
                'btn & slash'
            >
        >();
    });

    it('and narrows to the interaction arm, an agnostic arm adds nothing', () => {
        expectTypeOf(and(ButtonGate, AgnosticGate)).toEqualTypeOf<
            Gate<InteractionGateContext<ButtonInteraction> & GateContextBase, 'btn & any'>
        >();
    });

    it('and keeps the event requirement past an agnostic arm', () => {
        expectTypeOf(and(MessageGate, AgnosticGate)).toEqualTypeOf<
            Gate<EventGateContext<Events.MessageCreate> & GateContextBase, 'msg & any'>
        >();
    });

    it('or dedupes identical arms', () => {
        expectTypeOf(or(ButtonGate, ButtonGate)).toEqualTypeOf<
            Gate<InteractionGateContext<ButtonInteraction>, 'btn | btn'>
        >();
    });

    it('a union arm survives and-intersection (not UnionToIntersection)', () => {
        expectTypeOf(and(or(ButtonGate, SlashGate), AgnosticGate)).toEqualTypeOf<
            Gate<
                (InteractionGateContext<ButtonInteraction> | InteractionGateContext<ChatInputCommandInteraction>) &
                    GateContextBase,
                'btn | slash & any'
            >
        >();
    });

    it('a nested and arm keeps its tail inside an or union', () => {
        expectTypeOf(or(and(ButtonGate, AgnosticGate), SlashGate)).toEqualTypeOf<
            Gate<
                | (InteractionGateContext<ButtonInteraction> & GateContextBase)
                | InteractionGateContext<ChatInputCommandInteraction>,
                'btn & any | slash'
            >
        >();
    });

    it('RequiredOf recovers the context of an EffectGate', () => {
        expectTypeOf<RequiredOf<EffectGate<InteractionGateContext<ButtonInteraction>>>>().toEqualTypeOf<
            InteractionGateContext<ButtonInteraction>
        >();
    });

    it('an EffectGate is assignable to a Gate', () => {
        expectTypeOf<
            EffectGate<InteractionGateContext<ButtonInteraction>> extends Gate<GateContext> ? true : false
        >().toEqualTypeOf<true>();
    });

    it('a combinator erases the effect, leaving a plain Gate', () => {
        expectTypeOf(and(EffectButtonGate, AgnosticGate)).toEqualTypeOf<
            Gate<InteractionGateContext<ButtonInteraction> & GateContextBase, 'eff & any'>
        >();
    });

    it('Gate is bivariant in its context', () => {
        expectTypeOf<Gate<GateContextBase> extends Gate<GateContext> ? true : false>().toEqualTypeOf<true>();
        expectTypeOf<Gate<GateContext> extends Gate<GateContextBase> ? true : false>().toEqualTypeOf<true>();
    });

    it('disjoint interaction-kind gates are not mutually assignable', () => {
        // @ts-expect-error a button gate is not a slash gate
        const gSlash: Gate<InteractionGateContext<ChatInputCommandInteraction>> = ButtonGate;
        expect(gSlash).toBe(ButtonGate);
    });
});
