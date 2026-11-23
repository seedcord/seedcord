import { MessageFlags } from 'discord-api-types/v10';
import { describe, expect, it } from 'vite-plus/test';

import { deferFlags, sendFlags } from '#reply/flags';

describe('sendFlags', () => {
    it('always sets IsComponentsV2 and maps ephemeral to Ephemeral', () => {
        const flags = sendFlags({ ephemeral: true });
        expect(flags & MessageFlags.IsComponentsV2).toBe(MessageFlags.IsComponentsV2);
        expect(flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
        expect(flags & MessageFlags.SuppressNotifications).toBe(0);
    });

    it('clears Ephemeral when ephemeral is false', () => {
        const flags = sendFlags({ ephemeral: false });
        expect(flags & MessageFlags.IsComponentsV2).toBe(MessageFlags.IsComponentsV2);
        expect(flags & MessageFlags.Ephemeral).toBe(0);
    });

    it('maps silent to SuppressNotifications', () => {
        const flags = sendFlags({ ephemeral: true, silent: true });
        expect(flags & MessageFlags.SuppressNotifications).toBe(MessageFlags.SuppressNotifications);
    });

    it('combines ephemeral off with silent on', () => {
        const flags = sendFlags({ ephemeral: false, silent: true });
        expect(flags).toBe(MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications);
    });
});

describe('deferFlags', () => {
    it('maps ephemeral to Ephemeral with the content flag unset', () => {
        expect(deferFlags(true)).toBe(MessageFlags.Ephemeral);
    });

    it('is zero when ephemeral is false', () => {
        expect(deferFlags(false)).toBe(0);
    });
});
