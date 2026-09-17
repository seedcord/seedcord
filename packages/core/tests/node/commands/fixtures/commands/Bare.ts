import { BuilderComponent } from '#components/Component';
import { RegisterCommand } from '#decorators/Command';

@RegisterCommand()
export class BareCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');

        this.instance.setName('bare').setDescription('Deploys wherever the config points');
    }
}
