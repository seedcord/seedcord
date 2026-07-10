import { RegisterCommand, BuilderComponent } from '@seedcord/gateway';
import { ApplicationCommandType } from 'discord.js';

@RegisterCommand('global')
export class ViewProfileCommand extends BuilderComponent<'context_menu'> {
    constructor() {
        super('context_menu');

        this.instance.setName('View Profile').setType(ApplicationCommandType.User);
    }
}
