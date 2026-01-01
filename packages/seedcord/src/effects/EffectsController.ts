import { Logger } from '@seedcord/services';
import { traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Collection } from 'discord.js';
import { Envapter } from 'envapt';

import { HmrModuleHandler } from '@hmr/HmrModuleHandler';
import { Plugin } from '@interfaces/Plugin';

import { EffectMetadataKey } from './decorators/RegisterEffect';
import { UnknownException } from './default/UnknownException';
import { EffectsHandler } from './EffectsHandler';

import type { RegisterEffectMetadataEntry } from './decorators/RegisterEffect';
import type { AllEffects, EffectKeys, EffectsEvents } from './types/Effects';
import type { Core } from '@interfaces/Core';
import type { EventFrequency } from '@miscellaneous/types';
import type { HmrUpdateEvent } from '@seedcord/cli';
import type { TypedConstructor } from '@seedcord/types';

type EffectConstructor = TypedConstructor<typeof EffectsHandler>;
interface RegisteredEffectHandlerEntry {
    ctor: EffectConstructor;
    frequency: EventFrequency;
}

type EffectArtifact = EffectKeys[];

/**
 * Manages application effects and event handling
 *
 * Provides a centralized system for registering and executing custom effects
 * throughout the application lifecycle. Effects are loaded from configured directories
 * and can be triggered programmatically or by framework events.
 *
 * @internal Accessed via core.effects, not directly instantiated
 */
export class EffectsController extends Plugin<EffectsEvents> {
    public readonly logger = new Logger('Effects');
    public override readonly name = 'Effects';
    private isInitialized = false;
    private readonly effectsMap = new Collection<EffectKeys, RegisteredEffectHandlerEntry[]>();
    private readonly executedOnceHandlers = new Set<EffectConstructor>();
    private readonly hmrHandler?: HmrModuleHandler<EffectConstructor, void, EffectArtifact>;

    constructor(protected core: Core) {
        super(core);

        if (this.core.config.effects.path) {
            if (!Envapter.isDevelopment) return; // HMR only in development
            this.hmrHandler = new HmrModuleHandler({
                handlersDir: this.core.config.effects.path,
                isHandler: this.isEffectHandler.bind(this),
                registerHandler: this.registerEffect.bind(this),
                unregisterHandler: this.unregisterEffect.bind(this),
                getArtifacts: this.getArtifacts.bind(this),
                logger: this.logger.inChannel('hmr'),
                name: 'Effects'
            });
        }
    }

    private getArtifacts(ctor: EffectConstructor): EffectArtifact {
        const meta = Reflect.getMetadata(EffectMetadataKey, ctor) as RegisterEffectMetadataEntry;
        return [meta.effect];
    }

    public async init(): Promise<void> {
        if (this.isInitialized) return;

        this.isInitialized = true;

        this.registerEffect(UnknownException);

        const effectsDir = this.core.config.effects.path;
        if (effectsDir) {
            this.logger.info(chalk.bold(effectsDir));
            await this.loadEffects(effectsDir);
            const totalEffects = Array.from(this.effectsMap.values()).reduce(
                (acc, handlers) => acc + handlers.length,
                0
            );
            this.logger.utils.list([`${chalk.bold.magenta(totalEffects)} side effects`], chalk.bold.green('Loaded'));
        }
    }

    public override async onHmr(event: HmrUpdateEvent): Promise<void> {
        if (this.hmrHandler) {
            await this.hmrHandler.handle(event);
        }
    }

    private async loadEffects(dir: string): Promise<void> {
        await traverseDirectory(
            dir,
            (fullPath, relativePath, imported) => {
                for (const exportName of Object.keys(imported)) {
                    const val = imported[exportName];
                    if (this.isEffectHandler(val)) {
                        this.registerEffect(val);
                        this.hmrHandler?.trackHandler(fullPath, val);
                        this.logger.utils.registration(val.name, relativePath);
                    }
                }
            },
            this.logger
        );
    }

    private registerEffect(handler: EffectConstructor): void {
        const options = Reflect.getMetadata(EffectMetadataKey, handler) as RegisterEffectMetadataEntry;

        let handlers = this.effectsMap.get(options.effect);
        if (!handlers) {
            handlers = [];
            this.effectsMap.set(options.effect, handlers);
        }
        handlers.push({ ctor: handler, frequency: options.frequency ?? 'on' });
    }

    private unregisterEffect(handler: EffectConstructor, artifacts?: EffectArtifact): void {
        const effects = artifacts ?? (Array.from(this.effectsMap.keys()) as EffectArtifact);
        for (const effect of effects) {
            const handlers = this.effectsMap.get(effect as EffectKeys);
            if (!handlers) continue;
            const index = handlers.findIndex((entry) => entry.ctor === handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
        this.executedOnceHandlers.delete(handler);
    }

    private isEffectHandler(obj: unknown): obj is EffectConstructor {
        if (typeof obj !== 'function') return false;
        return obj.prototype instanceof EffectsHandler && Reflect.hasMetadata(EffectMetadataKey, obj);
    }

    public override emit<KeyOfEffects extends EffectKeys>(
        event: KeyOfEffects,
        data: AllEffects[KeyOfEffects]
    ): boolean {
        void this.processEffect(event, data);
        return super.emit(event, data);
    }

    private async processEffect<KeyOfEffects extends EffectKeys>(
        effectName: KeyOfEffects,
        data: AllEffects[KeyOfEffects]
    ): Promise<void> {
        const handlers = this.effectsMap.get(effectName);
        if (!handlers) return;

        for (const entry of handlers) {
            if (entry.frequency === 'once' && this.executedOnceHandlers.has(entry.ctor)) {
                continue;
            }

            try {
                const instance = new entry.ctor(data, this.core);
                await instance.execute();

                if (entry.frequency === 'once') {
                    this.executedOnceHandlers.add(entry.ctor);
                }
            } catch (err) {
                this.logger.error(`Error in side effect ${String(effectName)} handler ${entry.ctor.name}:`, err);
            }
        }
    }
}
