import { defineGate, SlashRoute } from '@seedcord/core';

import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { Gated } from '#src/gates/Gated';

import '#tests/node/discovery/fixtures/registry';

const GATE_DELAY_MS = 300;

let entered = Promise.withResolvers<undefined>();

export async function whileGateHolds<Sent, During>(
    sendSlowping: () => Promise<Sent>,
    during: () => Promise<During>
): Promise<[Sent, During]> {
    entered = Promise.withResolvers<undefined>();
    return await Promise.all([sendSlowping(), entered.promise.then(during)]);
}

const SlowGate = defineGate('SlowGate', async () => {
    entered.resolve(undefined);
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
