import { PermissionFlagsBits } from 'discord.js';

import { RegisterCommand } from '../../decorators/CommandRegisterable';
import { BuilderComponent } from '../../interfaces/Components';

@RegisterCommand('global')
export class TestErrorCommand extends BuilderComponent<'command'> {
  constructor() {
    super('command');

    this.instance
      .setName('throw')
      .setDescription('Create an error')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }
}
