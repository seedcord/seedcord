import { MessageFlags } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { flagsFor } from '@miscellaneous/flagsFor';

describe('flagsFor', () => {
    it('always sets IsComponentsV2 and adds Ephemeral for an ephemeral reply', () => {
        expect(flagsFor(true)).toBe(MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral);
    });

    it('sets only IsComponentsV2 for a public reply', () => {
        expect(flagsFor(false)).toBe(MessageFlags.IsComponentsV2);
    });
});
