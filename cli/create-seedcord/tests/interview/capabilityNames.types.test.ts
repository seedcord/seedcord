import { describe, expectTypeOf, it } from 'vitest';

import type { IntentName, PartialName } from '#interview/capabilities';
import type { GatewayIntentBits, Partials } from 'discord.js';

describe('the names the capability map declares', () => {
    it('are all real GatewayIntentBits members', () => {
        expectTypeOf<IntentName>().toExtend<keyof typeof GatewayIntentBits>();
    });

    it('are all real Partials members', () => {
        expectTypeOf<PartialName>().toExtend<keyof typeof Partials>();
    });
});
