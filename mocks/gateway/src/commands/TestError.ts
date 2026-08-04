import { RegisterCommand, BuilderComponent } from '@seedcord/gateway';
import { PermissionFlagsBits } from 'discord.js';

@RegisterCommand('global')
export class TestErrorCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('throw')
            .setDescription('Create an error')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
    }
}
