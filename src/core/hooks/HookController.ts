import chalk from 'chalk';
import * as path from 'path';
import { traverseDirectory } from '../library/Helpers';
import { Core } from '../library/interfaces/Core';
import { TypedConstructor } from '../library/types/Miscellaneous';
import { LogService } from '../services/LogService';
import { HookMetadataKey } from './decorators/RegisterHook';
import { HookEmitter } from './HookEmitter';
import { HookHandler } from './interfaces/HookHandler';
import { HookKeys, AllHooks } from './types/Hooks';

type HookConstructor = TypedConstructor<typeof HookHandler>;

export class HookController {
  private logger = new LogService('Hooks');
  private isInitialized = false;
  private hookMap = new Map<HookKeys, HookConstructor[]>();
  private readonly emitter = new HookEmitter();

  constructor(protected core: Core) {}

  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    const hooksDir = path.resolve(__dirname, './handlers');
    this.logger.info(chalk.bold(hooksDir));

    await this.loadHooks(hooksDir);
    this.attachHooks();

    const totalHooks = Array.from(this.hookMap.values()).reduce((acc, handlers) => acc + handlers.length, 0);
    this.logger.info(`${chalk.bold.green('Loaded')}: ${chalk.bold.magenta(totalHooks)} hooks`);
  }

  private async loadHooks(dir: string) {
    await traverseDirectory(dir, (_fullPath, relativePath, imported) => {
      for (const exportName of Object.keys(imported)) {
        const val = imported[exportName] as unknown;
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

  private attachHooks() {
    for (const [hookName, handlerCtors] of this.hookMap) {
      this.emitter.on(hookName, (data) => {
        for (const HandlerCtor of handlerCtors) {
          try {
            const instance = new HandlerCtor(data);
            void instance.execute();
          } catch (err) {
            this.logger.error(`Error in hook ${String(hookName)} handler ${HandlerCtor.name}:`, err);
          }
        }
      });
    }
  }

  public emit<E extends HookKeys>(event: E, data: AllHooks[E]) {
    return this.emitter.emit(event, data);
  }
}
