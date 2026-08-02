import type { ContextMenuCommandBuilder, SlashCommandBuilder } from '@discordjs/builders';
import type { APIApplicationCommand } from 'discord-api-types/v10';

/** @internal */
export type CommandBuilder = SlashCommandBuilder | ContextMenuCommandBuilder;

/** The commands Discord returns from each scope's deploy, keyed by command id. */
export interface DeployResult {
    global: Map<string, APIApplicationCommand>;
    guilds: Map<string, Map<string, APIApplicationCommand>>;
}
