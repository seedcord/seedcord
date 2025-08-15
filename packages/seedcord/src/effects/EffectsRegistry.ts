import chalk from 'chalk';

import { Plugin } from '../interfaces/Plugin';
import { traverseDirectory } from '../library/Helpers';
import { Logger } from '../services/Logger';
import { EffectMetadataKey } from './decorators/RegisterEffect';
import { UnknownException } from './default/UnknownException';
import { EffectsEmitter } from './EffectsEmitter';
import { EffectsHandler } from './interfaces/EffectsHandler';

import type { Core } from '../interfaces/Core';
import type { AllEffects, EffectKeys } from './types/Effects';
import type { TypedConstructor } from '@seedcord/types';

type EffectConstructor = TypedConstructor<typeof EffectsHandler>;

/**
 * Manages application effects and event handling
 *
 * Provides a centralized system for registering and executing custom effects
 * throughout the application lifecycle. Effects are loaded from configured directories
 * and can be triggered programmatically or by framework events.
 *
 * @internal Accessed via core.effects, not directly instantiated
 */
export class EffectsRegistry extends Plugin {
  public readonly logger = new Logger('Effects');
  private isInitialized = false;
  private readonly effectsMap = new Map<EffectKeys, EffectConstructor[]>();
  private readonly emitter = new EffectsEmitter();

  constructor(protected core: Core) {
    super(core);
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    this.isInitialized = true;

    const effectsDir = this.core.config.effects.path;
    this.logger.info(chalk.bold(effectsDir));

    this.registerEffect('unknownException', UnknownException);

    await this.loadEffects(effectsDir);

    this.attachEffects();

    const totalEffects = Array.from(this.effectsMap.values()).reduce((acc, handlers) => acc + handlers.length, 0);
    this.logger.info(`${chalk.bold.green('Loaded')}: ${chalk.bold.magenta(totalEffects)} side effects`);
  }

  private async loadEffects(dir: string): Promise<void> {
    await traverseDirectory(dir, (_fullPath, relativePath, imported) => {
      for (const exportName of Object.keys(imported)) {
        const val = imported[exportName];
        if (this.isEffectHandler(val)) {
          const effectName = Reflect.getMetadata(EffectMetadataKey, val) as EffectKeys | undefined;
          if (effectName) {
            this.registerEffect(effectName, val);
            this.logger.info(
              `${chalk.italic('Registered')} ${chalk.bold.yellow(val.name)} from ${chalk.gray(relativePath)}`
            );
          }
        }
      }
    });
  }

  private registerEffect(effectName: EffectKeys, handler: EffectConstructor): void {
    let handlers = this.effectsMap.get(effectName);
    if (!handlers) {
      handlers = [];
      this.effectsMap.set(effectName, handlers);
    }
    handlers.push(handler);
  }

  private isEffectHandler(obj: unknown): obj is EffectConstructor {
    if (typeof obj !== 'function') return false;
    return obj.prototype instanceof EffectsHandler;
  }

  private attachEffects(): void {
    for (const [effectName, handlerCtors] of this.effectsMap) {
      this.emitter.on(effectName, (data) => {
        for (const HandlerCtor of handlerCtors) {
          try {
            const instance = new HandlerCtor(data, this.core);
            void instance.execute();
          } catch (err) {
            this.logger.error(`Error in side effect ${String(effectName)} handler ${HandlerCtor.name}:`, err);
          }
        }
      });
    }
  }

  public emit<KeyOfEffects extends EffectKeys>(event: KeyOfEffects, data: AllEffects[KeyOfEffects]): boolean {
    return this.emitter.emit(event, data);
  }
}
