import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { decodeFor, prefixOf, CustomId } from '#customId/CustomId';
import { InvalidCustomId, StaleCustomId } from '#customId/Errors';

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

describe('CustomId stale detection', () => {
    it('flags a reordered oneOf as stale', () => {
        const v1 = new CustomId('poll').oneOf('choice', ['yes', 'no']);
        const v2 = new CustomId('poll').oneOf('choice', ['no', 'yes']);
        expect(() => v2.decode(v1.encode({ choice: 'no' }))).toThrow(StaleCustomId);
    });

    it('flags an int that gained bounds as stale', () => {
        const v1 = new CustomId('page').int('index');
        const v2 = new CustomId('page').int('index', 0, 100);
        expect(() => v2.decode(v1.encode({ index: 3 }))).toThrow(StaleCustomId);
    });
});

describe('CustomId corruption is rejected', () => {
    it('rejects an appended junk piece', () => {
        const Tag = new CustomId('tag').str('label');
        expect(() => Tag.decode(`${Tag.encode({ label: 'hi' })}\u{1F}JUNK`)).toThrow(InvalidCustomId);
    });

    it('rejects a body truncated to the routeKey', () => {
        const Ban = new CustomId('ban').snowflake('userId');
        const wire = Ban.encode({ userId: '853472916483920128' });
        expect(() => Ban.decode(wire.slice(0, wire.indexOf(':') + 1))).toThrow(InvalidCustomId);
    });

    it('rejects a bad base64 character', () => {
        const Ban = new CustomId('ban').snowflake('userId');
        expect(() => Ban.decode(`${Ban.encode({ userId: '853472916483920128' })}*`)).toThrow(InvalidCustomId);
    });

    it('rejects an unbounded int that decodes past the safe range', () => {
        // a body crafted to unpack above MAX_SAFE_INTEGER would silently truncate, so decode must reject it.
        const Ban = new CustomId('ban').snowflake('userId');
        const oversized = Ban.encode({ userId: (1n << 60n).toString() }).split(':')[1] ?? '';
        const Counter = new CustomId('counter').int('total');
        expect(() => Counter.decode(`${Counter.routeKey}:${oversized}`)).toThrow(InvalidCustomId);
    });

    it('rejects a packed block with leftover bits after unpacking', () => {
        // a single bool packs to 0 or 1, so a block that base64-decodes to 2 leaves a bit unconsumed.
        const Flag = new CustomId('flag').bool('on');
        expect(() => Flag.decode(`${Flag.routeKey}:C`)).toThrow(InvalidCustomId);
    });
});

describe('CustomId encode guards', () => {
    it('rejects a bounded int outside its range', () => {
        const Page = new CustomId('page').int('index', 0, 7);
        expect(thrownCode(() => Page.encode({ index: 50 }))).toBe(SeedcordErrorCode.CustomIdValueOutOfRange);
    });

    it('rejects a snowflake at or above 2^64', () => {
        const Ban = new CustomId('ban').snowflake('userId');
        expect(thrownCode(() => Ban.encode({ userId: (1n << 64n).toString() }))).toBe(
            SeedcordErrorCode.CustomIdValueOutOfRange
        );
    });

    it('rejects a snowflake that is not a numeric string', () => {
        const Ban = new CustomId('ban').snowflake('userId');
        expect(thrownCode(() => Ban.encode({ userId: 'not-a-snowflake' }))).toBe(
            SeedcordErrorCode.CustomIdValueOutOfRange
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
        expect(thrownCode(() => Counter.encode({ total: 2 ** 53 }))).toBe(SeedcordErrorCode.CustomIdValueOutOfRange);
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
            SeedcordErrorCode.CustomIdDuplicateFieldName
        );
    });

    it('rejects a oneOf with no choices', () => {
        // the type rejects an empty list, so cast past it to prove the runtime guard still fires.
        const empty = [] as unknown as [string]; // fixture cast, bypass NonEmptyTuple to reach the runtime guard
        expect(thrownCode(() => new CustomId('poll').oneOf('choice', empty))).toBe(
            SeedcordErrorCode.CustomIdEmptyChoices
        );
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
        expect(() => decodeFor(routes, 'zzz000:A')).toThrow(InvalidCustomId);
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
