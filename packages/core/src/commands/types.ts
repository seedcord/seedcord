import type { ContextMenuCommandBuilder, SlashCommandBuilder } from '@discordjs/builders';
import type { APIApplicationCommand } from 'discord-api-types/v10';

/** @internal */
export type CommandBuilder = SlashCommandBuilder | ContextMenuCommandBuilder;

/** discord returns these from each scope's deploy, keyed by command id. @internal */
export interface DeployResult {
    global: Map<string, APIApplicationCommand>;
    guilds: Map<string, Map<string, APIApplicationCommand>>;
}
