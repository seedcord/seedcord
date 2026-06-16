import { Notice } from '@seedcord/kit';
import { describe, it, expect } from 'vitest';

import { defineGate, eventGateContext, interactionGateContext, runGates } from '@bot/gates';

import { TestNotice } from '../../utils/TestNotice';

import type { GateContext } from '@bot/gates';
import type { Core } from '@interfaces/Core';
import type { ButtonInteraction } from 'discord.js';

// the gates under test ignore ctx, so a minimal cast stands in for a live context
const ctx = { kind: 'interaction' } as unknown as GateContext;

describe('runGates', () => {
    it('runs each gate in order and resolves when all pass', async () => {
        const order: string[] = [];
        const A = defineGate('a', () => {
            order.push('a');
        });
        const B = defineGate('b', () => {
            order.push('b');
        });

        await runGates([A, B], ctx);

        expect(order).toEqual(['a', 'b']);
    });

    it('propagates the first gate refusal and stops', async () => {
        const order: string[] = [];
        const A = defineGate('a', () => {
            order.push('a');
            throw new TestNotice('no');
        });
        const B = defineGate('b', () => {
            order.push('b');
        });

        await expect(runGates([A, B], ctx)).rejects.toBeInstanceOf(Notice);
        expect(order).toEqual(['a']);
    });
});

describe('interactionGateContext', () => {
    it('builds the interaction arm from the live interaction', () => {
        // a minimal interaction-shaped fake, the builder only reads these fields
        const interaction = {
            user: { id: 'u1' },
            guild: null,
            guildId: 'g1',
            channelId: 'c1'
        } as unknown as ButtonInteraction<'cached'>;
        // the builder never reads core
        const core = {} as unknown as Core;

        const built = interactionGateContext(interaction, core);

        expect(built.kind).toBe('interaction');
        expect(built.guildId).toBe('g1');
        expect(built.channelId).toBe('c1');
        expect(built.interaction).toBe(interaction);
    });
});

describe('eventGateContext', () => {
    it('builds the event arm and yields a null actor when the args carry no carrier', () => {
        // empty payload, so deriveEventActor finds no Message, GuildMember, or User to read
        const payload = [] as unknown as Parameters<typeof eventGateContext>[1];
        // the builder never reads core
        const core = {} as unknown as Core;

        const built = eventGateContext('messageCreate', payload, core);

        expect(built.kind).toBe('event');
        expect(built.eventName).toBe('messageCreate');
        expect(built.payload).toBe(payload);
        expect(built.user).toBeNull();
        expect(built.guild).toBeNull();
        expect(built.guildId).toBeNull();
        expect(built.channelId).toBeNull();
    });
});
