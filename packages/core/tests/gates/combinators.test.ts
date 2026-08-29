import { describe, it, expect, expectTypeOf } from 'vitest';

import { and, or } from '#gates/combinators';
import { defineGate } from '#gates/Gate';
import { Fault } from '#stops/Fault';
import { Notice } from '#stops/Notice';
import { Silence } from '#stops/Silence';

import { cardJson } from '../utils/cardText';
import { TestNotice } from '../utils/TestNotice';

import type { Gate, GateContextBase, RequiredOf } from '#gates/Gate';
import type { RenderContext } from '@seedcord/types';

// gates ignore ctx here, so a minimal cast stands in
const ctx = {} as unknown as GateContextBase;

const AgnosticGate = defineGate('any', () => {});

expectTypeOf(and(AgnosticGate, AgnosticGate)).toEqualTypeOf<Gate<GateContextBase, 'any & any'>>();

expectTypeOf(or(and(AgnosticGate, AgnosticGate), AgnosticGate)).toEqualTypeOf<
    Gate<GateContextBase, '(any & any) | any'>
>();

expectTypeOf(or(and(AgnosticGate, or(AgnosticGate, AgnosticGate)), AgnosticGate)).toEqualTypeOf<
    Gate<GateContextBase, '(any & (any | any)) | any'>
>();

expectTypeOf<RequiredOf<string>>().toEqualTypeOf<never>();

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

    it('names itself after its arms at runtime, matching the type-level name', () => {
        const A = defineGate('a', () => {});
        const B = defineGate('b', () => {});

        expect(and(A, B).name).toBe('a & b');
        expect(or(A, B).name).toBe('a | b');
    });

    it('wraps a nested combinator so the grouping survives the join', () => {
        const A = defineGate('a', () => {});
        const B = defineGate('b', () => {});
        const C = defineGate('c', () => {});

        expect(or(and(A, B), C).name).toBe('(a & b) | c');
        expect(and(or(A, B), C).name).toBe('(a | b) & c');
        expect(and(A, or(B, C)).name).toBe('a & (b | c)');
    });

    it('keeps bracketing every level down', () => {
        const A = defineGate('a', () => {});
        const B = defineGate('b', () => {});
        const C = defineGate('c', () => {});
        const D = defineGate('d', () => {});

        expect(or(and(A, or(B, C)), D).name).toBe('(a & (b | c)) | d');
        expect(and(or(and(A, B), C), D).name).toBe('((a & b) | c) & d');
        expect(and(or(A, B), or(C, D)).name).toBe('(a | b) & (c | d)');
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

    it('propagates a report-false Fault without catching it', async () => {
        const fault = new Fault({ report: false });
        const A = defineGate('a', () => {
            throw fault;
        });
        const B = defineGate('b', () => {});

        await expect(or(A, B).check(ctx)).rejects.toBe(fault);
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
        const reply = (thrown as Notice).render({} as unknown as RenderContext);
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
                (error: Notice) => error.render({} as unknown as RenderContext)
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
});

describe('combinator typing on the scalar base', () => {
    it('rejects or() with no arms at compile time', () => {
        // @ts-expect-error or requires at least two arms
        or();
    });

    it('rejects and() with no arms at compile time', () => {
        // @ts-expect-error and requires at least two arms
        and();
    });

    it('rejects or() with one arm at compile time', () => {
        // @ts-expect-error or of one gate is just that gate, so it requires at least two
        or(AgnosticGate);
    });

    it('rejects and() with one arm at compile time', () => {
        // @ts-expect-error and of one gate is just that gate, so it requires at least two
        and(AgnosticGate);
    });

    it('rejects a second options object', () => {
        const fail = new TestNotice('x');
        // @ts-expect-error only one trailing options object, the second is not a gate
        or(AgnosticGate, AgnosticGate, { fail }, { fail });
    });

    it('rejects an options object with no gates', () => {
        const fail = new TestNotice('x');
        // @ts-expect-error or requires at least two gates before the options
        or({ fail });
    });

    it('rejects an options object that is not last', () => {
        const fail = new TestNotice('x');
        // @ts-expect-error the options object only matches as the final argument
        or({ fail }, AgnosticGate, AgnosticGate);
    });
});
