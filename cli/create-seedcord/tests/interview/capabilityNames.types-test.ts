import { expectTypeOf } from 'vitest';

import type { IntentName, PartialName } from '#interview/capabilities';
import type { GatewayIntentBits, Partials } from 'discord.js';

expectTypeOf<IntentName>().toExtend<keyof typeof GatewayIntentBits>();

expectTypeOf<PartialName>().toExtend<keyof typeof Partials>();
