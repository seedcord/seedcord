import { core, it as base } from '@seedcord/plugin-utils/testing';
import mongoose from 'mongoose';
import { vi } from 'vite-plus/test';

import { Mongoose } from '#src/Mongoose';

import type { MongooseOptions } from '#src/types/MongooseOptions';

type MongooseWith = (options?: Partial<MongooseOptions>) => Mongoose;

export const it = base.extend<{ mongooseWith: MongooseWith }>({
    mongooseWith: async ({ testEnv }, use) => {
        await use(
            (options = {}) =>
                new Mongoose(core, {
                    uri: 'mongodb://localhost:27017',
                    name: 'test',
                    dir: testEnv.resolvePath('services'),
                    ...options
                })
        );
        // every test file shares the mongoose mock from setup.ts. a model left here is still registered in the next test
        for (const name of Object.keys(mongoose.models)) Reflect.deleteProperty(mongoose.models, name);
        vi.clearAllMocks();
    }
});
