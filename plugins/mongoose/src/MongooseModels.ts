import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import mongoose from 'mongoose';

import { modelNameOf } from './decorators/RegisterMongooseService';

import type { MongooseServiceConstructor } from './MongooseService';
import type { MongooseDocument } from './types/MongooseDocument';
import type { Logger } from '@seedcord/logger';

// mongoose keeps one model registry per process. This tracks the ones this plugin built
export class MongooseModels {
    private readonly own = new Set<string>();

    constructor(private readonly logger: Logger) {}

    public build(Service: MongooseServiceConstructor): mongoose.Model<MongooseDocument> {
        const modelName = modelNameOf(Service);

        // mongoose returns an existing model when the schema matches. That one is not this plugin's to delete
        const preexisting = modelName in mongoose.models;

        let model;
        try {
            model = mongoose.model<MongooseDocument>(modelName, Service.schema);
        } catch (caught) {
            throw new SeedcordError(SeedcordErrorCode.PluginMongooseModelCreationFailed, [modelName, Service.name], {
                cause: caught
            });
        }

        // tracked here because clear() has to delete it even when the service constructor throws
        if (!preexisting) this.own.add(model.modelName);
        return model;
    }

    public remove(Service: MongooseServiceConstructor): void {
        const modelName = modelNameOf(Service);
        if (!this.own.has(modelName)) return;

        mongoose.deleteModel(modelName);
        this.own.delete(modelName);
    }

    public clear(): void {
        if (this.own.size === 0) return;

        this.logger.trace(`Clearing ${this.own.size} mongoose models`);
        for (const name of this.own) mongoose.deleteModel(name);
        this.own.clear();
    }
}
