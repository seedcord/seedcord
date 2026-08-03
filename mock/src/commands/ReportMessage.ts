import { RegisterCommand, BuilderComponent } from '@seedcord/gateway';
import { ApplicationCommandType } from 'discord.js';

@RegisterCommand('global')
export class ReportMessageCommand extends BuilderComponent<'context_menu'> {
    constructor() {
        super('context_menu');

        this.instance.setName('Report Message').setType(ApplicationCommandType.Message);
    }
}
