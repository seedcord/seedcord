import type { Config } from './Config';
import type { Bot } from '../bot/Bot';
import type { HookController } from '../hooks/HookController';
import type { CoordinatedShutdown } from '../services/Lifecycle/CoordinatedShutdown';
import type { CoordinatedStartup } from '../services/Lifecycle/CoordinatedStartup';

interface BaseCore {
  readonly bot: Bot;
  readonly hooks: HookController;
  readonly shutdown: CoordinatedShutdown;
  readonly startup: CoordinatedStartup;

  readonly config: Config;

  start(): Promise<this>;
}

export interface Core extends BaseCore {}
