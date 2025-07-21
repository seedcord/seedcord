import type { Bot } from '../../../bot/Bot';
import type { Database } from '../../database/Database';
import type { HookController } from '../../hooks/HookController';
import type { CoordinatedShutdown } from '../../services/CoordinatedShutdown';

export type BotMode = 'bot';
export type CoreMode = BotMode;

interface CoreBase {
  readonly db: Database;
  readonly hooks: HookController;
  readonly shutdown: CoordinatedShutdown;

  start(): Promise<void>;
}

interface BotCore {
  readonly bot: Bot;
}

// XOR Core
export type Core = CoreBase & BotCore;
