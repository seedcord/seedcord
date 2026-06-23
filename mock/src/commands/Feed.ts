import { RegisterCommand, BuilderComponent } from 'seedcord';

@RegisterCommand('global')
export class FeedCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('feed')
            .setDescription('Complex pagination demo: a cursor source with a custom render and styled controls.');
    }
}
