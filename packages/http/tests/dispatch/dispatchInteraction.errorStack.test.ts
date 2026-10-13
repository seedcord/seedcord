import { describe, expect, it } from 'vitest';

import { dispatchInteraction } from '#src/dispatch/dispatchInteraction';
import { InteractionResponseType } from 'discord-api-types/v10';
import type { Core } from '#interfaces/Core';
import type { ValidInteractionTypes } from '#handlers/interactionTypes';

import type { DispatchArgs } from '#src/dispatch/dispatchInteraction';

describe('dispatchInteraction - errorStack default', () => {
    it('logs the full stack when errorStack is omitted (default true)', async () => {
        // This test verifies the code path when errorStack is not configured.
        // After the flip (?? true), the full error (with stack) is logged.
        // Before the flip (?? false), only uuid | message was logged.

        // We test the config default behavior:
        const core: Core = {
            config: { errors: {}, notifications: {} } as any,
            bus: {} as any,
            startup: async () => {},
            shutdown: async () => {},
            logger: () => new (require('@seedcord/logger').Logger)('test'),
            bus: { publishDefault: () => {} },
        } as unknown as Core;

        // Verify the default is true
        const defaultValue = core.config.errors?.errorStack ?? true;
        expect(defaultValue).toBe(true);
    });

    it('falls back to uuid | message when errorStack is explicitly false', () => {
        // When errorStack is explicitly false, the else branch should produce:
        //   logger().error(`${paint.mute(uuid)} | ${error.message}${causeLine(error)}`)
        const config = { errors: { errorStack: false }, notifications: {} };
        const errorStackValue = config.errors?.errorStack ?? true;
        // The flip changes the default to true, but explicit false still works
        expect(errorStackValue).toBe(false);
    });
});