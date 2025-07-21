import { BuilderComponent } from '../../interfaces/Components';

import type { Client } from 'discord.js';

export class MaintenanceEmbed extends BuilderComponent<'embed'> {
  constructor(client: Client) {
    super('embed');

    this.instance
      .setTitle('Ongoing Maintenance')
      .setDescription(`${client.user?.username} is currently down for maintenance! Please check back later.`);
  }
}
