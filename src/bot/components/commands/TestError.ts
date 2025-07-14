import { PermissionFlagsBits } from 'discord.js';
import { BuilderComponent } from '../../interfaces/Components';
import { RegisterCommand } from '../../decorators/CommandRegisterable';

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
