import { PermissionFlagsBits } from 'discord.js';
import { BuilderComponent } from '../../interfaces/Components';
import { RegisterCommand } from '../../decorators/CommandRegisterable';

@RegisterCommand('global')
export class MaintenanceCommand extends BuilderComponent<'command'> {
  constructor() {
    super('command');

    this.instance
      .setName('maintenance')
      .setDescription('Post maintenance message')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }
}
