import 'reflect-metadata';
import { ColorResolvable } from 'discord.js';
import dotenv from 'dotenv';
import { Env, Envuments } from '../../utilities/envuments';

export enum Environment {
  Development,
  Staging,
  Production
}

export class Globals extends Envuments {
  static {
    if (!process.env.ENV_LOADED) {
      dotenv.config();
      process.env.ENV_LOADED = 'true';
    }
  }

  // Environment
  private static internalEnvironment = this.determineEnvironment(this.get('NODE_ENV', 'development'));

  private static determineEnvironment(env: string | Environment): Environment {
    if (typeof env === 'string') {
      switch (env.toLowerCase()) {
        case 'production':
          return Environment.Production;
        case 'staging':
          return Environment.Staging;
        default:
          return Environment.Development;
      }
    }

    return env;
  }

  static set environment(env: string | Environment) {
    this.internalEnvironment = this.determineEnvironment(env);
  }

  static get environment(): Environment {
    return this.internalEnvironment;
  }

  static get isProduction(): boolean {
    return this.internalEnvironment === Environment.Production;
  }

  static get isStaging(): boolean {
    return this.internalEnvironment === Environment.Staging;
  }

  static get isDevelopment(): boolean {
    return this.internalEnvironment === Environment.Development;
  }

  // Secrets
  @Env('BOT_TOKEN')
  public static readonly botToken: string;

  // General
  @Env('MONGO_URI', 'mongodb://localhost:27017/')
  public static readonly mongoUri: string;

  @Env('DB_NAME', 'seedcord')
  public static readonly dbName: string;

  // Variables
  public static readonly botColor: ColorResolvable = this.isProduction ? '#dcc8f0' : '#fe565a';
}
