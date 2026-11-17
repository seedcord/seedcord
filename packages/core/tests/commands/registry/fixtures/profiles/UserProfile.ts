import { ApplicationCommandType } from 'discord-api-types/v10';

import { BuilderComponent } from '#components/Component';
import { RegisterCommand } from '#decorators/Command';

@RegisterCommand()
export class UserProfileCommand extends BuilderComponent<'context_menu'> {
    constructor() {
        super('context_menu');

        this.instance.setName('profile').setType(ApplicationCommandType.User);
    }
}
