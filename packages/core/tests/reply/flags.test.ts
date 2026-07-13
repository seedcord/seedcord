import { MessageFlags } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { deferFlags, sendFlags } from '@reply/flags';

describe('sendFlags', () => {
    it('always sets IsComponentsV2 and defaults to ephemeral', () => {
        const flags = sendFlags();
        expect(flags & MessageFlags.IsComponentsV2).toBe(MessageFlags.IsComponentsV2);
        expect(flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
        expect(flags & MessageFlags.SuppressNotifications).toBe(0);
    });

    it('drops Ephemeral when ephemeral is false', () => {
        const flags = sendFlags({ ephemeral: false });
        expect(flags & MessageFlags.IsComponentsV2).toBe(MessageFlags.IsComponentsV2);
        expect(flags & MessageFlags.Ephemeral).toBe(0);
    });

    it('maps silent to SuppressNotifications', () => {
        const flags = sendFlags({ silent: true });
        expect(flags & MessageFlags.SuppressNotifications).toBe(MessageFlags.SuppressNotifications);
    });

    it('combines ephemeral off with silent on', () => {
        const flags = sendFlags({ ephemeral: false, silent: true });
        expect(flags).toBe(MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications);
    });
});

describe('deferFlags', () => {
    it('defaults to ephemeral and carries no content flag', () => {
        expect(deferFlags()).toBe(MessageFlags.Ephemeral);
    });

    it('is zero when ephemeral is false', () => {
        expect(deferFlags({ ephemeral: false })).toBe(0);
    });
});
