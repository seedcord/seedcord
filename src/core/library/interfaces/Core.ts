import { Bot } from '../../../bot/Bot';
import { Database } from '../../database/Database';
import { HookController } from '../../hooks/HookController';

export type BotMode = 'bot';
export type CoreMode = BotMode;

interface CoreBase {
  readonly db: Database;
  readonly hooks: HookController;

  start(): Promise<void>;
}

interface BotCore {
  readonly bot: Bot;
}

// XOR Core
export type Core = CoreBase & BotCore;
