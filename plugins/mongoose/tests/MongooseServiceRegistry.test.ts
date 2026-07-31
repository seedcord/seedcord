import { Logger } from '@seedcord/logger';
import mongoose from 'mongoose';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { RegisterMongooseService } from '@src/decorators/RegisterMongooseService';
import { MongooseService } from '@src/MongooseService';
import { MongooseServiceRegistry } from '@src/MongooseServiceRegistry';

import type { CoreBase } from '@seedcord/core';
import type { Mongoose } from '@src/Mongoose';
import type { MongooseServiceConstructor } from '@src/MongooseService';

interface IUser {
    _id: string;
    username: string;
}

declare module '@src/types/MongooseServices' {
    interface MongooseServices {
        adopted: Adopted;
    }
}

@RegisterMongooseService('adopted')
class Adopted extends MongooseService<IUser> {
    public static schema = new mongoose.Schema<IUser>({ username: { type: String, required: true } });
}

// justified: the registry only forwards these two into the service constructor
const plugin = { _register: vi.fn() } as unknown as Mongoose;
const core = {} as unknown as CoreBase;

afterEach(() => {
    for (const name of Object.keys(mongoose.models)) Reflect.deleteProperty(mongoose.models, name);
    vi.clearAllMocks();
});

describe('MongooseServiceRegistry model ownership', () => {
    it('leaves a model another component already registered out of its cleanup', () => {
        // the same schema instance so mongoose returns the existing model and never throws
        mongoose.model('adopted', Adopted.schema);
        const registry = new MongooseServiceRegistry(plugin, core, new Logger('test'));

        // justified: discovery erases the document type which the type predicate hides in prod
        registry.initializeService(Adopted as unknown as MongooseServiceConstructor, 'Adopted.ts');
        registry.clearModels();

        expect(vi.mocked(mongoose.deleteModel)).not.toHaveBeenCalledWith('adopted');
    });

    it('cleans up a model it registered itself', () => {
        const registry = new MongooseServiceRegistry(plugin, core, new Logger('test'));

        // justified: discovery erases the document type which the type predicate hides in prod
        registry.initializeService(Adopted as unknown as MongooseServiceConstructor, 'Adopted.ts');
        registry.clearModels();

        expect(vi.mocked(mongoose.deleteModel)).toHaveBeenCalledWith('adopted');
    });
});
