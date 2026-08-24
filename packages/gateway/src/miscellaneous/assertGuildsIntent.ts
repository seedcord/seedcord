import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { GatewayIntentBits, InteractionContextType, IntentsBitField } from 'discord.js';

import type { BitFieldResolvable, GatewayIntentsString } from 'discord.js';

interface DeployableCommand {
    readonly name: string;
    toJSON(): { contexts?: InteractionContextType[] | undefined };
}

// discord reads a command with no contexts as reachable from all three
function reachesGuilds(command: DeployableCommand): boolean {
    const contexts = command.toJSON().contexts;
    if (!contexts || contexts.length === 0) return true;
    return contexts.includes(InteractionContextType.Guild);
}

// djs resolves interaction.guild out of a cache that stays empty without the Guilds intent
export function assertGuildsIntent(
    intents: BitFieldResolvable<GatewayIntentsString, number>,
    commands: readonly DeployableCommand[]
): void {
    if ((IntentsBitField.resolve(intents) & GatewayIntentBits.Guilds) !== 0) return;

    const needing = commands.filter((command) => reachesGuilds(command)).map((command) => command.name);
    if (needing.length === 0) return;

    throw new SeedcordError(SeedcordErrorCode.MissingGuildsIntent, [needing.join(', ')]);
}
