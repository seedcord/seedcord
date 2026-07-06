import { describe, it, expect } from 'vitest';

import { buildKey } from '../src/buildKey';

describe('buildKey', () => {
    it('joins the prefix and parts with colons', () => {
        expect(buildKey('cooldown', 'u1', 'g1')).toBe('cooldown:u1:g1');
    });

    it('substitutes global for an undefined part', () => {
        expect(buildKey('cooldown', undefined)).toBe('cooldown:global');
        expect(buildKey('p', 'a', undefined, 'c')).toBe('p:a:global:c');
    });

    it('substitutes global for a null part, the gate context scalar shape', () => {
        const guildId: string | null = null;
        expect(buildKey('cooldown', guildId)).toBe('cooldown:global');
    });

    it('returns the bare prefix when no parts are given', () => {
        expect(buildKey('cooldown')).toBe('cooldown');
    });

    it('composes real snowflake ids into a scoped key', () => {
        expect(buildKey('report', '850000000000000000', '900000000000000001')).toBe(
            'report:850000000000000000:900000000000000001'
        );
    });

    it('preserves an empty-string part as its own segment', () => {
        // '' is not nullish so ?? keeps it, only undefined becomes 'global'
        expect(buildKey('p', '')).toBe('p:');
        expect(buildKey('p', '', 'c')).toBe('p::c');
    });

    it('joins many parts in order', () => {
        expect(buildKey('p', 'a', 'b', 'c', 'd', 'e')).toBe('p:a:b:c:d:e');
    });

    it('keeps a colon inside the prefix, which can collide with an extra part', () => {
        expect(buildKey('a:b', 'c')).toBe('a:b:c');
        expect(buildKey('a:b', 'c')).toBe(buildKey('a', 'b', 'c'));
    });
});
