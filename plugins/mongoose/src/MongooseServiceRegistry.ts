import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { traverseDirectory } from '@seedcord/utils/node';
import chalk from 'chalk';
import mongoose from 'mongoose';

import { ModelNameMetadataKey, ServiceMetadataKey } from './decorators/RegisterMongooseService';
import { MongooseService } from './MongooseService';

import type { Mongoose, MongooseArtifact } from './Mongoose';
import type { MongooseServiceConstructor } from './MongooseService';
import type { MongooseServices } from './types/MongooseServices';
import type { CoreBase } from '@seedcord/core';
import type { Logger } from '@seedcord/logger';

/**
 * Discovers and registers Mongoose services for the plugin.
 */
export class MongooseServiceRegistry {
    // the augmented interface has no index signature, hence Reflect below
    private readonly services = Object.create(null) as MongooseServices;
    private readonly ownModels = new Set<string>();

    constructor(
        private readonly plugin: Mongoose,
        private readonly core: CoreBase,
        private readonly logger: Logger
    ) {}

    public get map(): MongooseServices {
        return this.services;
    }

    public register(key: string, instance: unknown): void {
        Reflect.set(this.services, key, instance);
    }

    public clear(): void {
        for (const key of Object.keys(this.services)) Reflect.deleteProperty(this.services, key);
    }

    // scoped to this plugin's own models because the mongoose registry is global and shared with
    // everything else in the process
    public clearModels(): void {
        if (this.ownModels.size === 0) return;

        this.logger.debug(`Clearing ${this.ownModels.size} mongoose models`);
        for (const name of this.ownModels) mongoose.deleteModel(name);
        this.ownModels.clear();
    }

    public async loadFromDirectory(
        dir: string,
        track: (file: string, ctor: MongooseServiceConstructor) => void
    ): Promise<void> {
        this.logger.info(chalk.bold(dir));

        await traverseDirectory(dir, (fullPath, rel, mod) => {
            for (const Service of Object.values(mod)) {
                if (!this.isServiceClass(Service)) continue;

                this.initializeService(Service, rel);
                track(fullPath, Service);
            }
        });

        this.logger.utils.list(
            [`${chalk.magenta(Object.keys(this.services).length)} services`],
            chalk.bold.green('Loaded')
        );
    }

    public initializeService(Service: MongooseServiceConstructor, relativePath: string): void {
        // isServiceClass gates every caller on ServiceMetadataKey, and the decorator writes both keys together
        const modelName = Reflect.getMetadata(ModelNameMetadataKey, Service) as string;

        // mongoose returns an existing model when the schema instance matches, and that one belongs
        // to whoever registered it first, so it should stay out of this plugin's cleanup
        const preexisting = modelName in mongoose.models;

        let model;
        try {
            model = mongoose.model(modelName, Service.schema);
        } catch (caught) {
            throw new SeedcordError(SeedcordErrorCode.PluginMongooseModelCreationFailed, [modelName, Service.name], {
                cause: caught
            });
        }

        // tracked before construction so a throw below still leaves the model reachable for cleanup
        if (!preexisting) this.ownModels.add(model.modelName);

        const instance = new Service(this.plugin, this.core, model);
        this.logger.utils.registration(instance.constructor.name, relativePath);
    }

    public unregister(Service: MongooseServiceConstructor, artifacts?: MongooseArtifact): void {
        const key = artifacts?.key ?? (Reflect.getMetadata(ServiceMetadataKey, Service) as string | undefined);
        const modelName =
            artifacts?.modelName ?? (Reflect.getMetadata(ModelNameMetadataKey, Service) as string | undefined);

        if (key && Reflect.get(this.services, key)) {
            Reflect.deleteProperty(this.services, key);
        }

        if (modelName) {
            mongoose.deleteModel(modelName);
            this.ownModels.delete(modelName);
        }
    }

    public getArtifacts(ctor: MongooseServiceConstructor): MongooseArtifact {
        const key = Reflect.getMetadata(ServiceMetadataKey, ctor) as string | undefined;
        const modelName = Reflect.getMetadata(ModelNameMetadataKey, ctor) as string | undefined;
        return {
            ...(key && { key }),
            ...(modelName && { modelName })
        };
    }

    public isServiceClass(obj: unknown): obj is MongooseServiceConstructor {
        return (
            typeof obj === 'function' &&
            obj.prototype instanceof MongooseService &&
            Reflect.hasMetadata(ServiceMetadataKey, obj)
        );
    }
}
