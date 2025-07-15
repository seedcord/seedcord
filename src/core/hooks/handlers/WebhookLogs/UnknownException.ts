import { DiscordAPIError, WebhookClient } from 'discord.js';
import { BuilderComponent } from '../../../../bot/interfaces/Components';
import { Images } from '../../../library/globals/Assets';
import { RegisterHook } from '../../decorators/RegisterHook';
import { WebhookLog } from '../../interfaces/abstracts/WebhookLog';
import { Globals } from '../../../library/globals/Globals';
import { AllHooks } from '../../types/Hooks';

@RegisterHook('unknownException')
export class UnknownException extends WebhookLog<'unknownException'> {
  webhook = new WebhookClient({
    url: Globals.isDevelopment ? '' : ''
  });

  async execute() {
    await this.webhook.send({
      username: 'Unknown Exception',
      avatarURL: Images.Error,
      embeds: [new UnhandledErrorEmbed(this.data).component]
    });
  }
}

class UnhandledErrorEmbed extends BuilderComponent<'embed'> {
  constructor(data: AllHooks['unknownException']) {
    super('embed');

    const [uuid, error, guild, user] = data;

    this.instance
      .setTitle(`An unknown exception was thrown`)
      .setColor('#ef4860')
      .setDescription(
        `**Guild ID:** \`${guild.id}\`\n` +
          `**Guild Name:** ${guild.name}\n` +
          `**User ID:** \`${user.id}\`\n` +
          `**Username:** ${user.username}\n` +
          `### UUID: \`${uuid}\`\n` +
          '```' +
          error.stack +
          '```'
      );

    this.setTimestampsIfAvailable(error);
  }

  private setTimestampsIfAvailable(error: Error): void {
    if (!(error instanceof DiscordAPIError)) return;

    const now = Date.now();

    // Extract the snowflake ID from `/interactions/{ID}/`
    const snowflake = error.url?.match(/\/interactions\/(\d+)\//)?.[1];
    if (!snowflake) return undefined;

    // Discord epoch offset (ms) and timestamp extraction
    const interactionTs = Number((BigInt(snowflake) >> 22n) + 1420070400000n);

    // Time difference
    const diff = now - interactionTs;
    const seconds = Math.floor(diff / 1000);
    const millis = diff % 1000;

    this.instance.addFields([
      {
        name: 'Timestamps',
        value:
          `- **\`Interaction sent\` :** ${new Date(interactionTs).toISOString()} (${interactionTs})\n` +
          `- **\`Error logged    \` :** ${new Date(now).toISOString()} (${now})\n` +
          `- **\`Offset          \` :** ${seconds}s ${millis}ms`,
        inline: true
      }
    ]);
  }
}
