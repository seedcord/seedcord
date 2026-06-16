import { Notice } from '@seedcord/kit';
import { GuildMember } from 'discord.js';
import { describe, it, expect } from 'vitest';

import { and, defineEffectGate, defineGate, or } from '@bot/gates';
import { eventGateContext, interactionGateContext, runGates } from '@bot/gates/runGates';

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

describe('effect gates', () => {
    it('runs an effect gate commit after every gate in the set passes', async () => {
        const order: string[] = [];
        const charge = defineEffectGate(
            'charge',
            () => {
                order.push('check');
            },
            () => {
                order.push('commit');
            }
        );
        const plain = defineGate('plain', () => {
            order.push('plain');
        });

        await runGates([charge, plain], ctx);

        // the commit waits until every check in the set has passed
        expect(order).toEqual(['check', 'plain', 'commit']);
    });

    it('skips a queued commit when a later gate refuses', async () => {
        const committed: string[] = [];
        const charge = defineEffectGate(
            'charge',
            () => {},
            () => {
                committed.push('charge');
            }
        );
        const refuse = defineGate('refuse', () => {
            throw new TestNotice('no');
        });

        await expect(runGates([charge, refuse], ctx)).rejects.toBeInstanceOf(Notice);

        // charge passed and queued its commit, but refuse stopped the set before the queue drained
        expect(committed).toEqual([]);
    });

    it('commits an effect gate nested in an and once the set passes', async () => {
        const committed: string[] = [];
        const charge = defineEffectGate(
            'charge',
            () => {},
            () => {
                committed.push('charge');
            }
        );
        const plain = defineGate('plain', () => {});

        await runGates([and(charge, plain)], ctx);

        // the combinator runs its arms through the same runner, so the effect arm still commits
        expect(committed).toEqual(['charge']);
    });

    it('commits only the winning arm of an or', async () => {
        const committed: string[] = [];
        const chargeA = defineEffectGate(
            'chargeA',
            () => {
                throw new TestNotice('a refuses');
            },
            () => {
                committed.push('a');
            }
        );
        const chargeB = defineEffectGate(
            'chargeB',
            () => {},
            () => {
                committed.push('b');
            }
        );

        await runGates([or(chargeA, chargeB)], ctx);

        // a refused so only b's commit is queued
        expect(committed).toEqual(['b']);
    });

    it('cancels a combinator effect when a later sibling refuses', async () => {
        const committed: string[] = [];
        const charge = defineEffectGate(
            'charge',
            () => {},
            () => {
                committed.push('charge');
            }
        );
        const plain = defineGate('plain', () => {});
        const refuse = defineGate('refuse', () => {
            throw new TestNotice('no');
        });

        await expect(runGates([and(charge, plain), refuse], ctx)).rejects.toBeInstanceOf(Notice);

        // the and passed and queued charge, but the sibling refuse stopped the set first
        expect(committed).toEqual([]);
    });

    it('rolls back the effect of a refused or arm, so a later arm winning does not commit it', async () => {
        const committed: string[] = [];
        const charge = defineEffectGate(
            'charge',
            () => {},
            () => {
                committed.push('charge');
            }
        );
        const refuse = defineGate('refuse', () => {
            throw new TestNotice('no');
        });
        const pass = defineGate('pass', () => {});

        await runGates([or(and(charge, refuse), pass)], ctx);

        // the first arm queued charge then refused, the or moved to pass, so charge must not commit
        expect(committed).toEqual([]);
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

    it('carries the caller member when the interaction provides a cached one', () => {
        // a real GuildMember instance, so the builder's instanceof guard keeps it
        const member = Object.create(GuildMember.prototype) as GuildMember;
        const interaction = {
            user: { id: 'u1' },
            member,
            guild: null,
            guildId: 'g1',
            channelId: 'c1'
        } as unknown as ButtonInteraction<'cached'>;
        const core = {} as unknown as Core;

        const built = interactionGateContext(interaction, core);

        expect(built.member).toBe(member);
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
        expect(built.member).toBeNull();
    });
});
