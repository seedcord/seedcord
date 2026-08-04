import { RegisterCommand, BuilderComponent } from '@seedcord/gateway';

@RegisterCommand('global')
export class RosterCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('roster')
            .setDescription('Simple pagination demo: an array source with the default render.');
    }
}
