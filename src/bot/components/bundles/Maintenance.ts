import { Client, PermissionFlagsBits } from 'discord.js';
import { BuilderComponent } from '../../interfaces/Components';

export class MaintenanceCommand extends BuilderComponent<'command'> {
  constructor() {
    super('command');

    this.instance
      .setName('maintenance')
      .setDescription('Post maintenance message')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }
}

export class MaintenenaceEmbed extends BuilderComponent<'embed'> {
  constructor(client: Client) {
    super('embed');

    this.instance
      .setTitle('Ongoing Maintenance')
      .setDescription(`${client.user?.username} is currently down for maintenance! Please check back later.`);
  }
}
