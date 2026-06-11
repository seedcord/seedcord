import { PermissionFlagsBits } from 'discord.js';
import { RegisterCommand, BuilderComponent } from 'seedcord';

@RegisterCommand('global')
export class MaintenanceCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('maintenance')
            .setDescription('Post maintenance message')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addUserOption((option) => option.setName('notify').setDescription('Member to notify').setRequired(true))
            .addStringOption((option) => option.setName('reason').setDescription('Why'));
    }
}
