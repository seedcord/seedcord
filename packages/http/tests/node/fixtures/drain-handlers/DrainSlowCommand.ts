import { setTimeout } from 'node:timers/promises';

import { SlashRoute } from '@seedcord/core';

import { SlashHandler } from '#handlers/interaction/SlashHandler';

declare module '@seedcord/core' {
    interface SlashRegistry {
        drainslow: { options: Record<never, never>; cache: 'cached' };
    }
}

// past the 202 and inside DRAIN_WINDOW_MS
const DRAIN_SLOW_MS = 100;

export const drainSlow = { finished: false };

@SlashRoute('drainslow')
export class DrainSlowCommand extends SlashHandler<'drainslow'> {
    async execute(): Promise<void> {
        await setTimeout(DRAIN_SLOW_MS);
        drainSlow.finished = true;
    }
}
