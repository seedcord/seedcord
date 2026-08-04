import { BuilderComponent, RegisterCommand } from '@seedcord/http';

@RegisterCommand('global')
export class Ping extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('ping')
            .setDescription('Check that the http receiver is answering')
            .addStringOption((option) =>
                option.setName('note').setDescription('Echoed back in the reply').setRequired(true)
            );
    }
}
