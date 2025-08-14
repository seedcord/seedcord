import { ColorResolvable } from 'discord.js';
import { Envapt, Envapter } from 'envapt';

/**
 * Global configuration variables for the application. These ENV variables are reserved for the framework.
 *
 * Set them in your `.env` file to override the default.
 */
export class Globals extends Envapter {
  @Envapt('DISCORD_BOT_TOKEN', { fallback: undefined })
  public static readonly botToken: string;

  // Healthcheck
  @Envapt('HEALTH_CHECK_PORT', { fallback: 6956 })
  public static readonly healthCheckPort: number;

  @Envapt('HEALTH_CHECK_PATH', { fallback: '/healthcheck' })
  public static readonly healthCheckPath: string;

  // Coordinated Shutdown
  @Envapt('SHUTDOWN_IS_ENABLED', { fallback: false })
  public static readonly shutdownIsEnabled: boolean;

  // Unknown Exception Webhook URL
  @Envapt('UNKNOWN_EXCEPTION_WEBHOOK_URL', { fallback: undefined })
  public static readonly unknownExceptionWebhookUrl: string;

  // Variables
  /**
   * The default color of the bot's embeds. Can simply override by `Globals.botColor =`
   */
  public static botColor: ColorResolvable = this.isProduction ? '#fe565a' : '#3fa045';
}
