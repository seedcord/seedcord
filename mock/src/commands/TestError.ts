import { PermissionFlagsBits } from 'discord.js';
import { RegisterCommand, BuilderComponent } from '@seedcord/gateway';

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
