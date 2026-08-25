import { defineGate, SlashRoute } from '@seedcord/core';

import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { Gated } from '#src/gates/Gated';

import '../registry';

const GATE_DELAY_MS = 300;

// pre-ack work, the 202 for this route flushes only after the delay
const SlowGate = defineGate('SlowGate', async () => {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, GATE_DELAY_MS));
});

declare module '@seedcord/core' {
    interface SlashRegistry {
        slowping: { options: Record<never, never>; cache: 'cached' };
    }
}

@Gated(SlowGate)
@SlashRoute('slowping')
export class SlowGateCommand extends SlashHandler<'slowping'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
