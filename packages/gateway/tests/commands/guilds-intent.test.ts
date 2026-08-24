import { SlashCommandBuilder } from '@discordjs/builders';
import { SeedcordErrorCode } from '@seedcord/errors';
import { GatewayIntentBits, InteractionContextType } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { assertGuildsIntent } from '#miscellaneous/assertGuildsIntent';

import type { BitFieldResolvable, GatewayIntentsString } from 'discord.js';

const guildOnly = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('d')
    .setContexts(InteractionContextType.Guild);

const dmOnly = new SlashCommandBuilder().setName('help').setDescription('d').setContexts(InteractionContextType.BotDM);

function check(
    intents: BitFieldResolvable<GatewayIntentsString, number>,
    ...commands: SlashCommandBuilder[]
): () => void {
    return () => {
        assertGuildsIntent(intents, commands);
    };
}

describe('assertGuildsIntent', () => {
    it('throws when a guild command runs without the intent that caches its guild', () => {
        expect(check([], guildOnly)).toThrow(expect.objectContaining({ code: SeedcordErrorCode.MissingGuildsIntent }));
    });

    it('names every command that needs the intent', () => {
        expect(check([], guildOnly, dmOnly)).toThrow(/ban/);
        expect(check([], guildOnly, dmOnly)).not.toThrow(/help/);
    });

    it('accepts a guild command once the intent is present', () => {
        expect(check([GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages], guildOnly)).not.toThrow();
    });

    it('resolves the intent out of a raw bitfield', () => {
        expect(check(GatewayIntentBits.Guilds, guildOnly)).not.toThrow();
    });

    it('leaves a bot whose commands never reach a guild alone', () => {
        expect(check([], dmOnly)).not.toThrow();
    });

    it('leaves a bot with no commands alone', () => {
        expect(check([])).not.toThrow();
    });
});
