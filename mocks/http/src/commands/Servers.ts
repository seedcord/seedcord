import { BuilderComponent, RegisterCommand } from '@seedcord/http';

@RegisterCommand('global')
export class Servers extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance.setName('servers').setDescription('Count the servers you are in, after you log in with Discord');
    }
}
