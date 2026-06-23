import { RegisterCommand, BuilderComponent } from 'seedcord';

@RegisterCommand('global')
export class DeferNoticeCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance
            .setName('defernotice')
            .setDescription('Probe a deferReply followed by a thrown Notice, to watch the reply path.');
    }
}
