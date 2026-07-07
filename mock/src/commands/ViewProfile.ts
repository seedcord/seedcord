import { ApplicationCommandType } from 'discord.js';
import { RegisterCommand, BuilderComponent } from '@seedcord/gateway';

@RegisterCommand('global')
export class ViewProfileCommand extends BuilderComponent<'context_menu'> {
    constructor() {
        super('context_menu');

        this.instance.setName('View Profile').setType(ApplicationCommandType.User);
    }
}
