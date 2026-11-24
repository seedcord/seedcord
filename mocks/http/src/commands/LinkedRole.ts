import { BuilderComponent, RegisterCommand } from '@seedcord/http';

@RegisterCommand()
export class LinkedRole extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('linked-role')
            .setDescription('Connect, update, or clear your Linked Role')
            .addStringOption((option) =>
                option
                    .setName('action')
                    .setDescription('What to do')
                    .setRequired(true)
                    .addChoices(
                        { name: 'connect', value: 'connect' },
                        { name: 'update', value: 'update' },
                        { name: 'clear', value: 'clear' }
                    )
            );
    }
}
