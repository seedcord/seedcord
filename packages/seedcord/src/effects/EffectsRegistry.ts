import { Logger } from '@seedcord/services';
import { traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Collection } from 'discord.js';

import { Plugin } from '@interfaces/Plugin';

import { EffectMetadataKey } from './decorators/RegisterEffect';
import { UnknownException } from './default/UnknownException';
import { EffectsEmitter } from './EffectsEmitter';
import { EffectsHandler } from './EffectsHandler';

import type { RegisterEffectMetadataEntry } from './decorators/RegisterEffect';
import type { AllEffects, EffectKeys } from './types/Effects';
import type { Core } from '@interfaces/Core';
import type { EventFrequency } from '@miscellaneous/types';
import type { TypedConstructor } from '@seedcord/types';

type EffectConstructor = TypedConstructor<typeof EffectsHandler>;
interface RegisteredEffectHandlerEntry {
    ctor: EffectConstructor;
    frequency: EventFrequency;
}

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
    private readonly effectsMap = new Collection<EffectKeys, RegisteredEffectHandlerEntry[]>();
    private readonly emitter = new EffectsEmitter();

    constructor(protected core: Core) {
        super(core);
    }

    public async init(): Promise<void> {
        if (this.isInitialized) return;

        this.isInitialized = true;

        const effectsDir = this.core.config.effects.path;
        this.logger.info(chalk.bold(effectsDir));

        this.registerEffect(UnknownException, { effect: 'unknownException', frequency: 'on' });

        await this.loadEffects(effectsDir);

        this.attachEffects();

        const totalEffects = Array.from(this.effectsMap.values()).reduce((acc, handlers) => acc + handlers.length, 0);
        this.logger.info(`${chalk.bold.green('Loaded')}: ${chalk.bold.magenta(totalEffects)} side effects`);
    }

    private async loadEffects(dir: string): Promise<void> {
        await traverseDirectory(
            dir,
            (_fullPath, relativePath, imported) => {
                for (const exportName of Object.keys(imported)) {
                    const val = imported[exportName];
                    if (this.isEffectHandler(val)) {
                        const meta = Reflect.getMetadata(EffectMetadataKey, val) as RegisterEffectMetadataEntry;
                        this.registerEffect(val, meta);
                        this.logger.info(
                            `${chalk.italic('Registered')} ${chalk.bold.yellow(val.name)} from ${chalk.gray(relativePath)}`
                        );
                    }
                }
            },
            this.logger
        );
    }

    private registerEffect(handler: EffectConstructor, options: RegisterEffectMetadataEntry): void {
        let handlers = this.effectsMap.get(options.effect);
        if (!handlers) {
            handlers = [];
            this.effectsMap.set(options.effect, handlers);
        }
        handlers.push({ ctor: handler, frequency: options.frequency ?? 'on' });
    }

    private isEffectHandler(obj: unknown): obj is EffectConstructor {
        if (typeof obj !== 'function') return false;
        return obj.prototype instanceof EffectsHandler && Reflect.hasMetadata(EffectMetadataKey, obj);
    }

    private attachEffects(): void {
        for (const [effectName, handlerEntries] of this.effectsMap) {
            for (const entry of handlerEntries) {
                const register =
                    entry.frequency === 'once'
                        ? this.emitter.once.bind(this.emitter)
                        : this.emitter.on.bind(this.emitter);
                register(effectName, (data) => {
                    try {
                        const instance = new entry.ctor(data, this.core);
                        void instance.execute();
                    } catch (err) {
                        this.logger.error(
                            `Error in side effect ${String(effectName)} handler ${entry.ctor.name}:`,
                            err
                        );
                    }
                });
            }
        }
    }

    public emit<KeyOfEffects extends EffectKeys>(event: KeyOfEffects, data: AllEffects[KeyOfEffects]): boolean {
        return this.emitter.emit(event, data);
    }
}
