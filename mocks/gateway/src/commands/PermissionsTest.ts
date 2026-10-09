import { RegisterCommand, BuilderComponent } from '@seedcord/gateway';
import { PermissionFlagsBits } from 'discord.js';

@RegisterCommand()
export class PermissionsCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('permissions')
            .setDescription('Test command for permissions')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addUserOption((option) =>
                option.setName('user').setDescription('The user to check permissions for').setRequired(false)
            );
    }
}
