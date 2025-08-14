import { PermissionFlagsBits } from 'discord.js';
import { RegisterCommand, BuilderComponent } from 'seedcord';

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
