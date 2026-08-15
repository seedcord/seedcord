import { describe, expect, it } from 'vitest';

import { hasCleanFlags } from '#commands/commands/CommandsCommand';

import type { CleanInvocation } from '#commands/commands/CommandsCommand';

const base: CleanInvocation = {
    clean: false,
    guild: [],
    allGuilds: false,
    apply: false,
    purge: false,
    yes: false
};

describe('hasCleanFlags', () => {
    it('is false with no flags', () => {
        expect(hasCleanFlags(base)).toBe(false);
    });

    it('is true when only --guild is given, so it never silently no-ops', () => {
        expect(hasCleanFlags({ ...base, guild: ['123'] })).toBe(true);
    });

    it('is true for --apply without --clean', () => {
        expect(hasCleanFlags({ ...base, apply: true })).toBe(true);
    });

    it('treats --yes alone as no action', () => {
        expect(hasCleanFlags({ ...base, yes: true })).toBe(false);
    });
});
