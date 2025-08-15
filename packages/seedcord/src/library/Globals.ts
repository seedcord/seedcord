import { ColorResolvable } from 'discord.js';
import { Envapt, Envapter } from 'envapt';

/**
 * Global configuration variables and environment settings
 *
 * Provides centralized access to environment variables and framework settings.
 * Extend this class in your bot to add custom environment variables.
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
  /** Default color for bot embeds - can be overridden by setting Globals.botColor */
  public static botColor: ColorResolvable = this.isProduction ? '#fe565a' : '#3fa045';
}
