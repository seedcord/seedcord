import { createRequire } from 'node:module';

import type * as rest from '@discordjs/rest';

// a gateway bot's rest and every discord.js call throw this build's `DiscordAPIError` because discord.js loads it
// justified: both builds export the same classes
export const { DiscordAPIError: CommonJsDiscordAPIError } = createRequire(import.meta.url)(
    '@discordjs/rest'
) as typeof rest;
