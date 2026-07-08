import { RegisterCommand, BuilderComponent } from '@seedcord/gateway';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

@RegisterCommand('global')
export class MaintenanceCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('maintenance')
            .setDescription('Post maintenance message')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addUserOption((option) => option.setName('notify').setDescription('Member to notify').setRequired(true))
            .addChannelOption((option) =>
                option
                    .setName('target')
                    .setDescription('Channel to post the notice in')
                    .setRequired(true)
                    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            )
            .addStringOption((option) => option.setName('reason').setDescription('Why'));
    }
}
