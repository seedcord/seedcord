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

let run = { finished: false };

export function nextDrainSlowRun(): { readonly finished: boolean } {
    run = { finished: false };
    return run;
}

@SlashRoute('drainslow')
export class DrainSlowCommand extends SlashHandler<'drainslow'> {
    async execute(): Promise<void> {
        const current = run;
        await setTimeout(DRAIN_SLOW_MS);
        current.finished = true;
    }
}
