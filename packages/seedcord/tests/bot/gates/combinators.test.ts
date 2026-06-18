import { Fault, Notice, Silence } from '@seedcord/kit';
import { describe, it, expect, expectTypeOf } from 'vitest';

import { and, defineGate, or } from '@bot/gates';

import { cardJson } from '../../utils/cardText';
import { TestNotice } from '../../utils/TestNotice';

import type { EventGateContext, Gate, GateContext, GateContextBase, InteractionGateContext } from '@bot/gates';
import type { EffectGate, RequiredOf } from '@bot/gates/Gate';
import type { RenderContext } from '@seedcord/types';
import type { ButtonInteraction, ChatInputCommandInteraction, Events } from 'discord.js';

// the gates under test ignore ctx, so a minimal cast stands in for a live context
const ctx = { kind: 'interaction' } as unknown as GateContext;

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

describe('and', () => {
    it('runs every arm in order and passes when all pass', async () => {
        const order: string[] = [];
        const A = defineGate('a', () => {
            order.push('a');
        });
        const B = defineGate('b', () => {
            order.push('b');
        });

        await and(A, B).check(ctx);

        expect(order).toEqual(['a', 'b']);
    });

    it('stops at the first refusal and propagates it', async () => {
        const order: string[] = [];
        const A = defineGate('a', () => {
            order.push('a');
            throw new TestNotice('a refused');
        });
        const B = defineGate('b', () => {
            order.push('b');
        });

        await expect(and(A, B).check(ctx)).rejects.toBeInstanceOf(Notice);
        expect(order).toEqual(['a']);
    });
});

describe('or', () => {
    it('passes on the first arm that passes and skips the rest', async () => {
        const order: string[] = [];
        const A = defineGate('a', () => {
            order.push('a');
        });
        const B = defineGate('b', () => {
            order.push('b');
        });

        await or(A, B).check(ctx);

        expect(order).toEqual(['a']);
    });

    it('catches a report-false refusal and tries the next arm', async () => {
        const order: string[] = [];
        const A = defineGate('a', () => {
            order.push('a');
            throw new TestNotice('a refused');
        });
        const B = defineGate('b', () => {
            order.push('b');
        });

        await or(A, B).check(ctx);

        expect(order).toEqual(['a', 'b']);
    });

    it('propagates a Fault without catching it', async () => {
        const order: string[] = [];
        const A = defineGate('a', () => {
            order.push('a');
            throw new Fault();
        });
        const B = defineGate('b', () => {
            order.push('b');
        });

        await expect(or(A, B).check(ctx)).rejects.toBeInstanceOf(Fault);
        expect(order).toEqual(['a']);
    });

    it('propagates a Silence without catching it', async () => {
        const A = defineGate('a', () => {
            throw new Silence();
        });
        const B = defineGate('b', () => {});

        await expect(or(A, B).check(ctx)).rejects.toBeInstanceOf(Silence);
    });

    it('propagates a raw error without catching it', async () => {
        const A = defineGate('a', () => {
            throw new Error('boom');
        });
        const B = defineGate('b', () => {});

        await expect(or(A, B).check(ctx)).rejects.toThrow('boom');
    });

    it('throws a refusal when every arm refuses', async () => {
        const A = defineGate('a', () => {
            throw new TestNotice('a refused');
        });
        const B = defineGate('b', () => {
            throw new TestNotice('b refused');
        });

        await expect(or(A, B).check(ctx)).rejects.toBeInstanceOf(Notice);
    });

    it('lists each arm summary when every refusing arm has one', async () => {
        const A = defineGate('a', () => {
            const notice = new TestNotice('a');
            notice.summary = 'Manage Server';
            throw notice;
        });
        const B = defineGate('b', () => {
            const notice = new TestNotice('b');
            notice.summary = 'be a bot owner';
            throw notice;
        });

        const thrown = await or(A, B)
            .check(ctx)
            .then(
                () => undefined,
                (error: unknown) => error
            );

        expect(thrown).toBeInstanceOf(Notice);
        // the list render ignores ctx, so a minimal cast stands in
        const reply = (thrown as Notice).render({} as RenderContext);
        const description = cardJson(reply);
        expect(description).toContain('Manage Server');
        expect(description).toContain('be a bot owner');
    });

    it('falls back to the neutral refusal when an arm has no summary', async () => {
        const A = defineGate('a', () => {
            const notice = new TestNotice('a');
            notice.summary = 'Manage Server';
            throw notice;
        });
        const B = defineGate('b', () => {
            throw new TestNotice('b');
        });

        const reply = await or(A, B)
            .check(ctx)
            .then(
                () => {
                    throw new Error('expected a refusal');
                },
                // the render ignores ctx, so a minimal cast stands in
                (error: Notice) => error.render({} as RenderContext)
            );

        const description = cardJson(reply);
        expect(description).not.toContain('Manage Server');
        expect(description).toContain('not allowed');
    });

    it('throws the author fail notice when every arm refuses', async () => {
        const A = defineGate('a', () => {
            throw new TestNotice('a');
        });
        const B = defineGate('b', () => {
            throw new TestNotice('b');
        });
        const fail = new TestNotice('custom');

        await expect(or(A, B, { fail }).check(ctx)).rejects.toBe(fail);
    });

    it('calls the author fail factory with ctx when every arm refuses', async () => {
        const A = defineGate('a', () => {
            throw new TestNotice('a');
        });
        const B = defineGate('b', () => {
            throw new TestNotice('b');
        });
        const fail = new TestNotice('custom');

        await expect(or(A, B, { fail: () => fail }).check(ctx)).rejects.toBe(fail);
    });

    it('the author fail beats the auto-list default', async () => {
        const A = defineGate('a', () => {
            const notice = new TestNotice('a');
            notice.summary = 'Manage Server';
            throw notice;
        });
        const B = defineGate('b', () => {
            const notice = new TestNotice('b');
            notice.summary = 'be a bot owner';
            throw notice;
        });
        const fail = new TestNotice('custom');

        await expect(or(A, B, { fail }).check(ctx)).rejects.toBe(fail);
    });

    it('unions the required contexts of its arms', () => {
        expectTypeOf(or(ButtonGate, SlashGate)).toEqualTypeOf<
            Gate<
                InteractionGateContext<ButtonInteraction> | InteractionGateContext<ChatInputCommandInteraction>,
                'btn | slash'
            >
        >();
    });
});

describe('combinator result types', () => {
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

    it('and of two agnostic gates stays the identity base', () => {
        expectTypeOf(and(AgnosticGate, AgnosticGate)).toEqualTypeOf<Gate<GateContextBase, 'any & any'>>();
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

    it('RequiredOf of a non-gate is never', () => {
        expectTypeOf<RequiredOf<string>>().toEqualTypeOf<never>();
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

describe('empty combinator input', () => {
    it('rejects or() with no arms at compile time', () => {
        // @ts-expect-error or needs at least two arms
        or();
    });

    it('rejects and() with no arms at compile time', () => {
        // @ts-expect-error and needs at least two arms
        and();
    });
});

describe('single-arg combinator input', () => {
    it('rejects or() with one arm at compile time', () => {
        // @ts-expect-error or of one gate is just that gate, so it needs at least two
        or(ButtonGate);
    });

    it('rejects and() with one arm at compile time', () => {
        // @ts-expect-error and of one gate is just that gate, so it needs at least two
        and(ButtonGate);
    });
});

describe('or fail-option typing', () => {
    const fail = new TestNotice('x');

    it('rejects a second options object', () => {
        // @ts-expect-error only one trailing options object, the second is not a gate
        or(AgnosticGate, AgnosticGate, { fail }, { fail });
    });

    it('rejects an options object with no gates', () => {
        // @ts-expect-error or needs at least two gates before the options
        or({ fail });
    });

    it('rejects an options object that is not last', () => {
        // @ts-expect-error the options object only matches as the final argument
        or({ fail }, AgnosticGate, AgnosticGate);
    });
});
