import { ColorResolvable } from 'discord.js';

import 'reflect-metadata';
import { Env } from '../../utilities/envuments/Env';
import { Envuments } from '../../utilities/envuments/Envuments';

export class Globals extends Envuments {
  // Secrets
  @Env('BOT_TOKEN', { fallback: undefined })
  public static readonly botToken: string;

  // General
  @Env('MONGO_URI', { fallback: 'mongodb://localhost:27017/' })
  public static readonly mongoUri: string;

  @Env('DB_NAME', { fallback: 'seedcord' })
  public static readonly dbName: string;

  // Health Check
  @Env('HEALTH_CHECK_PORT', { fallback: 6956 })
  public static readonly healthCheckPort: number;

  @Env('HEALTH_CHECK_PATH', { fallback: '/healthcheck' })
  public static readonly healthCheckPath: string;

  // Coordinated Shutdown
  @Env('SHUTDOWN_IS_ENABLED', { fallback: false })
  public static readonly shutdownIsEnabled: boolean;

  // Variables
  public static readonly botColor: ColorResolvable = this.isProduction ? '#dcc8f0' : '#fe565a';
}
