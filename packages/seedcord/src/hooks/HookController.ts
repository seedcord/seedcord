import chalk from 'chalk';

import { Plugin } from '../interfaces/Plugin';
import { traverseDirectory } from '../library/Helpers';
import { Logger } from '../services/Logger';
import { HookMetadataKey } from './decorators/RegisterHook';
import { UnknownException } from './default/UnknownException';
import { HookEmitter } from './HookEmitter';
import { HookHandler } from './interfaces/HookHandler';

import type { Core } from '../interfaces/Core';
import type { AllHooks, HookKeys } from './types/Hooks';
import type { TypedConstructor } from '@seedcord/types';

type HookConstructor = TypedConstructor<typeof HookHandler>;

export class HookController extends Plugin {
  public readonly logger = new Logger('Hooks');
  private isInitialized = false;
  private readonly hookMap = new Map<HookKeys, HookConstructor[]>();
  private readonly emitter = new HookEmitter();

  constructor(protected core: Core) {
    super(core);
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    this.isInitialized = true;

    const hooksDir = this.core.config.hooks.path;
    this.logger.info(chalk.bold(hooksDir));

    this.registerHook('unknownException', UnknownException);

    await this.loadHooks(hooksDir);

    this.attachHooks();

    const totalHooks = Array.from(this.hookMap.values()).reduce((acc, handlers) => acc + handlers.length, 0);
    this.logger.info(`${chalk.bold.green('Loaded')}: ${chalk.bold.magenta(totalHooks)} hooks`);
  }

  private async loadHooks(dir: string): Promise<void> {
    await traverseDirectory(dir, (_fullPath, relativePath, imported) => {
      for (const exportName of Object.keys(imported)) {
        const val = imported[exportName];
        if (this.isHookHandler(val)) {
          const hookName = Reflect.getMetadata(HookMetadataKey, val) as HookKeys | undefined;
          if (hookName) {
            this.registerHook(hookName, val);
            this.logger.info(
              `${chalk.italic('Registered')} ${chalk.bold.yellow(val.name)} from ${chalk.gray(relativePath)}`
            );
          }
        }
      }
    });
  }

  private registerHook(hookName: HookKeys, handler: HookConstructor): void {
    let handlers = this.hookMap.get(hookName);
    if (!handlers) {
      handlers = [];
      this.hookMap.set(hookName, handlers);
    }
    handlers.push(handler);
  }

  private isHookHandler(obj: unknown): obj is HookConstructor {
    if (typeof obj !== 'function') return false;
    return obj.prototype instanceof HookHandler;
  }

  private attachHooks(): void {
    for (const [hookName, handlerCtors] of this.hookMap) {
      this.emitter.on(hookName, (data) => {
        for (const HandlerCtor of handlerCtors) {
          try {
            const instance = new HandlerCtor(data, this.core);
            void instance.execute();
          } catch (err) {
            this.logger.error(`Error in hook ${String(hookName)} handler ${HandlerCtor.name}:`, err);
          }
        }
      });
    }
  }

  public emit<KeyOfHooks extends HookKeys>(event: KeyOfHooks, data: AllHooks[KeyOfHooks]): boolean {
    return this.emitter.emit(event, data);
  }
}
