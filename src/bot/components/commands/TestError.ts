import { PermissionFlagsBits } from 'discord.js';
import { BuilderComponent } from '../../interfaces/Components';

export class TestErrorCommand extends BuilderComponent<'command'> {
  constructor() {
    super('command');

    this.instance
      .setName('throw')
      .setDescription('Create an error')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }
}
