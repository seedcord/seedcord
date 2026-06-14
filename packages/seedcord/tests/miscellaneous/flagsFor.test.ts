import { MessageFlags } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { flagsFor } from '@miscellaneous/flagsFor';

describe('flagsFor', () => {
    it('returns the Ephemeral flag for a classic ephemeral reply', () => {
        expect(flagsFor(false, true)).toBe(MessageFlags.Ephemeral);
    });

    it('returns no flags for a classic public reply', () => {
        expect(flagsFor(false, false)).toBe(0);
    });

    it('returns the IsComponentsV2 flag for a public v2 reply', () => {
        expect(flagsFor(true, false)).toBe(MessageFlags.IsComponentsV2);
    });

    it('ORs both flags for an ephemeral v2 reply', () => {
        expect(flagsFor(true, true)).toBe(MessageFlags.Ephemeral | MessageFlags.IsComponentsV2);
    });
});
