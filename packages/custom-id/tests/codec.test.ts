import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { decodeFor, prefixOf, CustomId } from '#src/CustomId';

import type { SeedcordError } from '@seedcord/errors/internal';

// the SeedcordError code a thrown error carries, or undefined when it threw something else.
function thrownCode(run: () => unknown): SeedcordErrorCode | undefined {
    try {
        run();
    } catch (error) {
        return (error as SeedcordError).code; // fixture cast, read the code off whatever was thrown
    }
    return undefined;
}

function thrownMessage(run: () => unknown): string {
    try {
        run();
    } catch (error) {
        return (error as Error).message; // fixture cast, read the message off whatever was thrown
    }
    return '';
}

describe('nullable fields', () => {
    it('round-trips null and a value for every kind', () => {
        const Every = new CustomId('every')
            .snowflake('userId', { nullable: true })
            .uuid('ticketId', { nullable: true })
            .int('priority', 0, 5, { nullable: true })
            .int('reopenCount', { nullable: true })
            .bool('escalated', { nullable: true })
            .oneOf('queue', ['billing', 'tech'], { nullable: true })
            .str('subject', { nullable: true });

        const absent = {
            userId: null,
            ticketId: null,
            priority: null,
            reopenCount: null,
            escalated: null,
            queue: null,
            subject: null
        };
        expect(Every.decode(Every.encode(absent))).toEqual(absent);

        const present = {
            userId: '853472916483920128',
            ticketId: '6a1f4c2e-8b3d-4e7a-9c0f-1d2e3f4a5b6c',
            priority: 4,
            reopenCount: 12,
            escalated: false,
            queue: 'tech' as const,
            subject: 'cannot log in'
        };
        expect(Every.decode(Every.encode(present))).toEqual(present);
    });

    it('keeps an empty string apart from null on a nullable str', () => {
        const Note = new CustomId('note').str('body', { nullable: true });

        expect(Note.decode(Note.encode({ body: '' })).body).toBe('');
        expect(Note.decode(Note.encode({ body: null })).body).toBeNull();
    });

    it('keeps false apart from null on a nullable bool', () => {
        const Flag = new CustomId('flag').bool('silent', { nullable: true });

        expect(Flag.decode(Flag.encode({ silent: false })).silent).toBe(false);
        expect(Flag.decode(Flag.encode({ silent: null })).silent).toBeNull();
    });

    it('marks a wire stale once a field turns nullable', () => {
        const before = new CustomId('report').snowflake('claimedBy');
        const after = new CustomId('report').snowflake('claimedBy', { nullable: true });
        const wire = before.encode({ claimedBy: '853472916483920128' });

        expect(thrownCode(() => after.decode(wire))).toBe(SeedcordErrorCode.CustomIdWireStale);
    });

    it('leaves a field alone when nullable is false', () => {
        const Plain = new CustomId('plain').snowflake('userId', { nullable: false });
        const Omitted = new CustomId('plain').snowflake('userId');

        expect(Plain.routeKey).toBe(Omitted.routeKey);
        expect(
            thrownCode(() =>
                Plain.encode({
                    // @ts-expect-error a non-nullable field rejects null at compile time and at runtime
                    userId: null
                })
            )
        ).toBe(SeedcordErrorCode.CustomIdValueRejected);
    });
});

describe('CustomId round-trips', () => {
    it('round-trips every field kind in one customId', () => {
        // a support-ticket action button that carries one field of every kind at once.
        const TicketAction = new CustomId('ticket')
            .snowflake('userId')
            .uuid('ticketId')
            .int('priority', 0, 5)
            .int('reopenCount')
            .bool('escalated')
            .oneOf('queue', ['billing', 'tech', 'abuse'])
            .str('subject');
        const values = {
            userId: '853472916483920128',
            ticketId: '6a1f4c2e-8b3d-4e7a-9c0f-1d2e3f4a5b6c',
            priority: 4,
            reopenCount: 12,
            escalated: true,
            queue: 'abuse' as const,
            subject: 'cannot log in'
        };
        expect(TicketAction.decode(TicketAction.encode(values))).toEqual(values);
    });

    it('keeps a snowflake exact across the full 64-bit range', () => {
        const Ban = new CustomId('ban').snowflake('userId');
        const userId = ((1n << 64n) - 1n).toString();
        expect(Ban.decode(Ban.encode({ userId })).userId).toBe(userId);
    });

    it('round-trips a negative unbounded int', () => {
        // an unbounded int packs through zigzag, so a negative reputation delta must survive.
        const Reputation = new CustomId('rep').int('delta');
        expect(Reputation.decode(Reputation.encode({ delta: -424_242 })).delta).toBe(-424_242);
    });

    it('keeps an unbounded int exact at the safe-integer boundary', () => {
        const Counter = new CustomId('counter').int('total');
        expect(Counter.decode(Counter.encode({ total: Number.MAX_SAFE_INTEGER })).total).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('encodes the declared max of a bounded int whose range spans 2^53', () => {
        const Big = new CustomId('big').int('n', 0, 2 ** 53);
        expect(Big.decode(Big.encode({ n: 2 ** 53 })).n).toBe(2 ** 53);
    });

    it('round-trips a bounded int whose slot lands past 2^53', () => {
        // a negative min pushes the stored number past 2^53, where js numbers start skipping.
        const Big = new CustomId('big').int('n', -2, Number.MAX_SAFE_INTEGER);
        expect(Big.decode(Big.encode({ n: Number.MAX_SAFE_INTEGER })).n).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('gives two bounded ints past 2^53 two different wires', () => {
        const Big = new CustomId('big').int('n', -2, Number.MAX_SAFE_INTEGER);
        expect(Big.encode({ n: Number.MAX_SAFE_INTEGER })).not.toBe(Big.encode({ n: Number.MAX_SAFE_INTEGER - 1 }));
    });

    it('round-trips a customId with no fields', () => {
        const Refresh = new CustomId('refresh');
        expect(Refresh.decode(Refresh.encode({}))).toEqual({});
    });

    it('escapes a string field that contains the wire control characters', () => {
        // a free-text note can hold the bytes the codec uses to split and escape tokens.
        const Note = new CustomId('note').str('body');
        const body = 'a-b\u{1F}c\u{1B}d';
        expect(Note.decode(Note.encode({ body })).body).toBe(body);
    });

    it('lowercases a decoded uuid', () => {
        const Group = new CustomId('group').uuid('groupId');
        const upper = '6A1F4C2E-8B3D-4E7A-9C0F-1D2E3F4A5B6C';
        expect(Group.decode(Group.encode({ groupId: upper })).groupId).toBe(upper.toLowerCase());
    });
});

describe('someOf fields', () => {
    // a self-assign role menu, where the confirm button carries what the member picked.
    const ROLES = ['reader', 'artist', 'streamer', 'events', 'vip'] as const;
    const Assign = new CustomId('assign').someOf('roles', ROLES);

    it('round-trips a subset', () => {
        expect(Assign.decode(Assign.encode({ roles: ['artist', 'events'] })).roles).toEqual(['artist', 'events']);
    });

    it('collapses a repeated choice into one entry', () => {
        expect(Assign.decode(Assign.encode({ roles: ['artist', 'events', 'artist', 'events'] })).roles).toEqual([
            'artist',
            'events'
        ]);
    });

    it('round-trips the empty set', () => {
        expect(Assign.decode(Assign.encode({ roles: [] })).roles).toEqual([]);
    });

    it('round-trips every choice at once', () => {
        expect(Assign.decode(Assign.encode({ roles: [...ROLES] })).roles).toEqual([...ROLES]);
    });

    it('returns the choices in declaration order', () => {
        expect(Assign.decode(Assign.encode({ roles: ['vip', 'reader', 'events'] })).roles).toEqual([
            'reader',
            'events',
            'vip'
        ]);
    });

    it('mints one wire for the same set in either order', () => {
        expect(Assign.encode({ roles: ['streamer', 'reader'] })).toBe(Assign.encode({ roles: ['reader', 'streamer'] }));
    });

    it('spends one bit per choice', () => {
        // five choices pack into a radix-32 slot, which is one base64 character.
        const body = Assign.encode({ roles: [...ROLES] }).split(':')[1];
        expect(body).toHaveLength(1);
    });

    it('keeps null apart from the empty set when nullable', () => {
        const Optional = new CustomId('assign').someOf('roles', ROLES, { nullable: true });
        expect(Optional.decode(Optional.encode({ roles: [] })).roles).toEqual([]);
        expect(Optional.decode(Optional.encode({ roles: null })).roles).toBeNull();
    });

    it('mints one wire whether a choice repeats or not', () => {
        expect(Assign.encode({ roles: ['vip', 'vip'] })).toBe(Assign.encode({ roles: ['vip'] }));
    });

    it('rejects a choice that is not on the list', () => {
        expect(
            thrownCode(() =>
                Assign.encode({
                    // @ts-expect-error a someOf field rejects an unlisted value at compile time and at runtime
                    roles: ['reader', 'admin']
                })
            )
        ).toBe(SeedcordErrorCode.CustomIdValueRejected);
    });

    it('rejects a value that is not an array', () => {
        expect(
            thrownCode(() =>
                Assign.encode({
                    // @ts-expect-error a someOf field rejects a bare string at compile time and at runtime
                    roles: 'reader'
                })
            )
        ).toBe(SeedcordErrorCode.CustomIdValueRejected);
    });

    it('rejects an array that holds itself', () => {
        // formatting the value for the message must not follow the cycle.
        const cyclic: unknown[] = [];
        cyclic.push(cyclic);
        expect(
            thrownCode(() =>
                Assign.encode({
                    // @ts-expect-error a someOf field rejects a nested array at compile time and at runtime
                    roles: cyclic
                })
            )
        ).toBe(SeedcordErrorCode.CustomIdValueRejected);
    });
});

describe('CustomId stale detection', () => {
    it('flags a reordered oneOf as stale', () => {
        const v1 = new CustomId('poll').oneOf('choice', ['yes', 'no']);
        const v2 = new CustomId('poll').oneOf('choice', ['no', 'yes']);
        expect(thrownCode(() => v2.decode(v1.encode({ choice: 'no' })))).toBe(SeedcordErrorCode.CustomIdWireStale);
    });

    it('flags an int that gained bounds as stale', () => {
        const v1 = new CustomId('page').int('index');
        const v2 = new CustomId('page').int('index', 0, 100);
        expect(thrownCode(() => v2.decode(v1.encode({ index: 3 })))).toBe(SeedcordErrorCode.CustomIdWireStale);
    });

    it('flags a someOf that gained a choice as stale', () => {
        const v1 = new CustomId('assign').someOf('roles', ['reader', 'artist']);
        const v2 = new CustomId('assign').someOf('roles', ['reader', 'artist', 'vip']);
        expect(thrownCode(() => v2.decode(v1.encode({ roles: ['artist'] })))).toBe(SeedcordErrorCode.CustomIdWireStale);
    });

    it('flags a reordered someOf as stale', () => {
        const v1 = new CustomId('assign').someOf('roles', ['reader', 'artist']);
        const v2 = new CustomId('assign').someOf('roles', ['artist', 'reader']);
        expect(thrownCode(() => v2.decode(v1.encode({ roles: ['artist'] })))).toBe(SeedcordErrorCode.CustomIdWireStale);
    });

    it('flags a someOf that lost a choice as stale', () => {
        const v1 = new CustomId('assign').someOf('roles', ['reader', 'artist', 'vip']);
        const v2 = new CustomId('assign').someOf('roles', ['reader', 'artist']);
        expect(thrownCode(() => v2.decode(v1.encode({ roles: ['reader'] })))).toBe(SeedcordErrorCode.CustomIdWireStale);
    });

    it('flags a oneOf swapped for a someOf as stale', () => {
        const v1 = new CustomId('assign').oneOf('roles', ['reader', 'artist']);
        const v2 = new CustomId('assign').someOf('roles', ['reader', 'artist']);
        expect(thrownCode(() => v2.decode(v1.encode({ roles: 'artist' })))).toBe(SeedcordErrorCode.CustomIdWireStale);
    });

    it('flags a swapped emoji oneOf as stale', () => {
        const v1 = new CustomId('react').oneOf('emoji', ['\u{1F44D}', '\u{1F44E}']);
        const v2 = new CustomId('react').oneOf('emoji', ['\u{1F44F}', '\u{1F440}']);
        expect(thrownCode(() => v2.decode(v1.encode({ emoji: '\u{1F44E}' })))).toBe(
            SeedcordErrorCode.CustomIdWireStale
        );
    });

    it('hashes two emoji from one surrogate block apart', () => {
        const grin = new CustomId('react').oneOf('emoji', ['\u{1F600}']);
        const beam = new CustomId('react').oneOf('emoji', ['\u{1F601}']);
        expect(grin.routeKey).not.toBe(beam.routeKey);
    });
});

describe('routeKey stability', () => {
    // the guide prints these in components/custom-ids.mdx and components/stale.mdx. changing the hash edits both.
    const Ticket = new CustomId('ticket').snowflake('ownerId').oneOf('action', ['close', 'reopen']);

    it('pins the routeKeys the guide documents', () => {
        expect(Ticket.routeKey).toBe('ticketVrl');
        expect(new CustomId('ticket').snowflake('userId').oneOf('action', ['close', 'reopen']).routeKey).toBe(
            'ticketbdx'
        );
        expect(
            new CustomId('ticket').snowflake('ownerId').oneOf('action', ['close', 'reopen', 'escalate']).routeKey
        ).toBe('ticketY1t');
        expect(new CustomId('ticket').oneOf('action', ['close', 'reopen']).snowflake('ownerId').routeKey).toBe(
            'ticketpXF'
        );
        expect(Ticket.bool('notify').routeKey).toBe('ticketuFh');
    });
});

describe('CustomId corruption is rejected', () => {
    it('rejects an appended junk piece', () => {
        const Tag = new CustomId('tag').str('label');
        expect(thrownCode(() => Tag.decode(`${Tag.encode({ label: 'hi' })}\u{1F}JUNK`))).toBe(
            SeedcordErrorCode.CustomIdWireInvalid
        );
    });

    it('rejects a body truncated to the routeKey', () => {
        const Ban = new CustomId('ban').snowflake('userId');
        const wire = Ban.encode({ userId: '853472916483920128' });
        expect(thrownCode(() => Ban.decode(wire.slice(0, wire.indexOf(':') + 1)))).toBe(
            SeedcordErrorCode.CustomIdWireInvalid
        );
    });

    it('rejects a bad base64 character', () => {
        const Ban = new CustomId('ban').snowflake('userId');
        expect(thrownCode(() => Ban.decode(`${Ban.encode({ userId: '853472916483920128' })}*`))).toBe(
            SeedcordErrorCode.CustomIdWireInvalid
        );
    });

    it('rejects an unbounded int that decodes past the safe range', () => {
        // a body crafted to unpack above MAX_SAFE_INTEGER would silently truncate, so decode must reject it.
        const Ban = new CustomId('ban').snowflake('userId');
        const oversized = Ban.encode({ userId: (1n << 60n).toString() }).split(':')[1] ?? '';
        const Counter = new CustomId('counter').int('total');
        expect(thrownCode(() => Counter.decode(`${Counter.routeKey}:${oversized}`))).toBe(
            SeedcordErrorCode.CustomIdWireInvalid
        );
    });

    it('rejects a bounded int wire past what a js number holds', () => {
        // 2^53 + 1 sits inside the declared range, and no js number holds it exactly.
        const Ban = new CustomId('ban').snowflake('userId');
        const body = Ban.encode({ userId: (2n ** 53n + 1n).toString() }).split(':')[1] ?? '';
        const Big = new CustomId('big').int('v', 0, 2 ** 60);
        expect(thrownCode(() => Big.decode(`${Big.routeKey}:${body}`))).toBe(SeedcordErrorCode.CustomIdWireInvalid);
    });

    it('rejects a packed block with leftover bits after unpacking', () => {
        // a single bool packs to 0 or 1, so a block that base64-decodes to 2 leaves a bit unconsumed.
        const Flag = new CustomId('flag').bool('on');
        expect(thrownCode(() => Flag.decode(`${Flag.routeKey}:C`))).toBe(SeedcordErrorCode.CustomIdWireInvalid);
    });
});

describe('CustomId encode guards', () => {
    it('rejects a bounded int outside its range', () => {
        const Page = new CustomId('page').int('index', 0, 7);
        expect(thrownCode(() => Page.encode({ index: 50 }))).toBe(SeedcordErrorCode.CustomIdValueRejected);
    });

    it('rejects a snowflake at or above 2^64', () => {
        const Ban = new CustomId('ban').snowflake('userId');
        expect(thrownCode(() => Ban.encode({ userId: (1n << 64n).toString() }))).toBe(
            SeedcordErrorCode.CustomIdValueRejected
        );
    });

    it('rejects a snowflake that is not a numeric string', () => {
        const Ban = new CustomId('ban').snowflake('userId');
        expect(thrownCode(() => Ban.encode({ userId: 'not-a-snowflake' }))).toBe(
            SeedcordErrorCode.CustomIdValueRejected
        );
    });

    it('rejects a wire over 100 chars', () => {
        const Long = new CustomId('long').str('a').str('b');
        expect(thrownCode(() => Long.encode({ a: 'z'.repeat(60), b: 'z'.repeat(60) }))).toBe(
            SeedcordErrorCode.CustomIdWireTooLong
        );
    });

    it('rejects an unbounded int beyond the safe-integer range at encode time', () => {
        const Counter = new CustomId('counter').int('total');
        expect(thrownCode(() => Counter.encode({ total: 2 ** 53 }))).toBe(SeedcordErrorCode.CustomIdValueRejected);
    });

    it('throws a range error for an unbounded int past the safe range and a type error for a fraction', () => {
        const Counter = new CustomId('counter').int('total');
        expect(() => Counter.encode({ total: 2 ** 53 })).toThrow(RangeError);
        expect(() => Counter.encode({ total: 1.5 })).toThrow(TypeError);
    });

    it('rejects a str that is not a string', () => {
        const Note = new CustomId('note').str('body');
        expect(
            thrownCode(() =>
                Note.encode({
                    // @ts-expect-error a str field rejects a number at compile time and at runtime
                    body: 42
                })
            )
        ).toBe(SeedcordErrorCode.CustomIdValueRejected);
    });

    it('rejects null on a non-nullable str', () => {
        const Note = new CustomId('note').str('body');
        expect(
            thrownCode(() =>
                Note.encode({
                    // @ts-expect-error a non-nullable field rejects null at compile time and at runtime
                    body: null
                })
            )
        ).toBe(SeedcordErrorCode.CustomIdValueRejected);
    });

    it('rejects null on a non-nullable bool', () => {
        const Flag = new CustomId('flag').bool('silent');
        expect(
            thrownCode(() =>
                Flag.encode({
                    // @ts-expect-error a non-nullable field rejects null at compile time and at runtime
                    silent: null
                })
            )
        ).toBe(SeedcordErrorCode.CustomIdValueRejected);
    });

    it('rejects a bool that is not a boolean', () => {
        const Flag = new CustomId('flag').bool('silent');
        expect(
            thrownCode(() =>
                Flag.encode({
                    // @ts-expect-error a bool field rejects a string at compile time and at runtime
                    silent: 'false'
                })
            )
        ).toBe(SeedcordErrorCode.CustomIdValueRejected);
    });
});

describe('CustomId rejection messages', () => {
    it('names the type a bool expects and quotes the string it got', () => {
        const Flag = new CustomId('flag').bool('silent');
        const message = thrownMessage(() =>
            Flag.encode({
                // @ts-expect-error a bool field rejects a string at compile time and at runtime
                silent: 'false'
            })
        );
        expect(message).toContain('expects a boolean');
        expect(message).toContain('"false"');
    });

    it('names the declared bounds an int expects', () => {
        const Page = new CustomId('page').int('index', 0, 7);
        expect(thrownMessage(() => Page.encode({ index: 50 }))).toContain('expects an integer from 0 to 7');
    });

    it('names the choices a oneOf expects', () => {
        const Poll = new CustomId('poll').oneOf('choice', ['yes', 'no']);
        expect(
            thrownMessage(() =>
                Poll.encode({
                    // @ts-expect-error a oneOf field rejects an unlisted value at compile time and at runtime
                    choice: 'maybe'
                })
            )
        ).toContain('expects one of "yes", "no"');
    });

    it('names what a str expects', () => {
        const Note = new CustomId('note').str('body');
        expect(
            thrownMessage(() =>
                Note.encode({
                    // @ts-expect-error a str field rejects a number at compile time and at runtime
                    body: 42
                })
            )
        ).toContain('expects a string');
    });
});

describe('CustomId definition guards', () => {
    it('rejects a prefix that contains a colon', () => {
        expect(thrownCode(() => new CustomId('a:b'))).toBe(SeedcordErrorCode.CustomIdInvalidPrefix);
    });

    it('rejects an empty prefix', () => {
        expect(thrownCode(() => new CustomId(''))).toBe(SeedcordErrorCode.CustomIdInvalidPrefix);
    });

    it('rejects an integer-like field name', () => {
        expect(thrownCode(() => new CustomId('vote').bool('0'))).toBe(SeedcordErrorCode.CustomIdReservedFieldName);
    });

    it('rejects a duplicate field name', () => {
        expect(thrownCode(() => new CustomId('page').int('index', 0, 9).bool('index'))).toBe(
            SeedcordErrorCode.CoreDuplicateName
        );
    });

    it('rejects a oneOf with no choices', () => {
        // the type rejects an empty list, so cast past it to prove the runtime guard still fires.
        const empty = [] as unknown as [string]; // fixture cast, bypass NonEmptyTuple to reach the runtime guard
        expect(thrownCode(() => new CustomId('poll').oneOf('choice', empty))).toBe(
            SeedcordErrorCode.CustomIdEmptyChoices
        );
    });

    it('rejects a someOf with no choices', () => {
        const empty = [] as unknown as [string]; // fixture cast, bypass NonEmptyTuple to reach the runtime guard
        expect(thrownCode(() => new CustomId('assign').someOf('roles', empty))).toBe(
            SeedcordErrorCode.CustomIdEmptyChoices
        );
    });

    it('names the method that was called with no choices', () => {
        const empty = [] as unknown as [string]; // fixture cast, bypass NonEmptyTuple to reach the runtime guard
        expect(thrownMessage(() => new CustomId('assign').someOf('roles', empty))).toContain('someOf()');
        expect(thrownMessage(() => new CustomId('poll').oneOf('choice', empty))).toContain('oneOf()');
    });

    it('rejects an int with min over max', () => {
        expect(thrownCode(() => new CustomId('page').int('index', 5, 2))).toBe(SeedcordErrorCode.CustomIdInvalidBounds);
    });
});

describe('decodeFor', () => {
    // an approve/deny button pair on one message, each carrying the user it acts on.
    const Approve = new CustomId('approve').snowflake('userId');
    const Deny = new CustomId('deny').snowflake('userId').str('reason');
    const routes = [Approve, Deny] as const;

    it('returns the matched prefix and params', () => {
        const route = decodeFor(routes, Deny.encode({ userId: '853472916483920128', reason: 'spam' }));
        expect(route.prefix).toBe('deny');
        expect(route.params).toEqual({ userId: '853472916483920128', reason: 'spam' });
    });

    it('throws when no customId owns the wire', () => {
        expect(thrownCode(() => decodeFor(routes, 'zzz000:A'))).toBe(SeedcordErrorCode.CustomIdWireInvalid);
    });
});

describe('CustomId layout hash', () => {
    it('is stable for the same shape', () => {
        const a = new CustomId('rsvp').int('seats', 1, 8).str('note');
        const b = new CustomId('rsvp').int('seats', 1, 8).str('note');
        expect(a.routeKey).toBe(b.routeKey);
    });
});

describe('prefixOf', () => {
    it('strips the layout hash to recover the stable prefix', () => {
        const def = new CustomId('approve').snowflake('userId');
        expect(prefixOf(def.encode({ userId: '853472916483920128' }))).toBe('approve');
    });

    it('returns empty when the routeKey is too short to carry a hash', () => {
        expect(prefixOf('ab:body')).toBe('');
    });
});
