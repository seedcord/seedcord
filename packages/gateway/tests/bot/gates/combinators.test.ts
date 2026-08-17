import { and, defineGate, or } from '@seedcord/core';
import { describe, it, expect, expectTypeOf } from 'vitest';

import type { EventGateContext, GateContext, InteractionGateContext } from '#bot/gates';
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

expectTypeOf(or(ButtonGate, SlashGate)).toEqualTypeOf<
    Gate<InteractionGateContext<ButtonInteraction> | InteractionGateContext<ChatInputCommandInteraction>, 'btn | slash'>
>();

expectTypeOf(or(ButtonGate, SlashGate)).toEqualTypeOf<
    Gate<InteractionGateContext<ButtonInteraction> | InteractionGateContext<ChatInputCommandInteraction>, 'btn | slash'>
>();

expectTypeOf(or(ButtonGate, MessageGate)).toEqualTypeOf<
    Gate<InteractionGateContext<ButtonInteraction> | EventGateContext<Events.MessageCreate>, 'btn | msg'>
>();

expectTypeOf(or(MessageGate, MemberGate)).toEqualTypeOf<
    Gate<EventGateContext<Events.MessageCreate> | EventGateContext<Events.GuildMemberAdd>, 'msg | mem'>
>();

expectTypeOf(and(ButtonGate, MessageGate)).toEqualTypeOf<
    Gate<
        InteractionGateContext<ButtonInteraction> & EventGateContext<Events.MessageCreate> & GateContextBase,
        'btn & msg'
    >
>();

expectTypeOf(and(ButtonGate, SlashGate)).toEqualTypeOf<
    Gate<
        InteractionGateContext<ButtonInteraction> &
            InteractionGateContext<ChatInputCommandInteraction> &
            GateContextBase,
        'btn & slash'
    >
>();

expectTypeOf(and(ButtonGate, AgnosticGate)).toEqualTypeOf<
    Gate<InteractionGateContext<ButtonInteraction> & GateContextBase, 'btn & any'>
>();

expectTypeOf(and(MessageGate, AgnosticGate)).toEqualTypeOf<
    Gate<EventGateContext<Events.MessageCreate> & GateContextBase, 'msg & any'>
>();

expectTypeOf(or(ButtonGate, ButtonGate)).toEqualTypeOf<Gate<InteractionGateContext<ButtonInteraction>, 'btn | btn'>>();

expectTypeOf(and(or(ButtonGate, SlashGate), AgnosticGate)).toEqualTypeOf<
    Gate<
        (InteractionGateContext<ButtonInteraction> | InteractionGateContext<ChatInputCommandInteraction>) &
            GateContextBase,
        'btn | slash & any'
    >
>();

expectTypeOf(or(and(ButtonGate, AgnosticGate), SlashGate)).toEqualTypeOf<
    Gate<
        | (InteractionGateContext<ButtonInteraction> & GateContextBase)
        | InteractionGateContext<ChatInputCommandInteraction>,
        'btn & any | slash'
    >
>();

expectTypeOf<RequiredOf<EffectGate<InteractionGateContext<ButtonInteraction>>>>().toEqualTypeOf<
    InteractionGateContext<ButtonInteraction>
>();

expectTypeOf<
    EffectGate<InteractionGateContext<ButtonInteraction>> extends Gate<GateContext> ? true : false
>().toEqualTypeOf<true>();

expectTypeOf(and(EffectButtonGate, AgnosticGate)).toEqualTypeOf<
    Gate<InteractionGateContext<ButtonInteraction> & GateContextBase, 'eff & any'>
>();

expectTypeOf<Gate<GateContextBase> extends Gate<GateContext> ? true : false>().toEqualTypeOf<true>();
expectTypeOf<Gate<GateContext> extends Gate<GateContextBase> ? true : false>().toEqualTypeOf<true>();

describe('combinator result types on the gateway arms', () => {
    it('disjoint interaction-kind gates are not mutually assignable', () => {
        // @ts-expect-error a button gate is not a slash gate
        const gSlash: Gate<InteractionGateContext<ChatInputCommandInteraction>> = ButtonGate;
        expect(gSlash).toBe(ButtonGate);
    });
});
