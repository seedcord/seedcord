import { pathToFileURL } from 'node:url';

import { Logger } from '@seedcord/logger';
import mongoose from 'mongoose';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

import { MongooseServiceRegistry } from '#src/MongooseServiceRegistry';

import { pluginsPath } from './utils/source-path';
import { TestEnvironment } from './utils/test-env';

import type { Mongoose } from '#src/Mongoose';
import type { CoreBase } from '@seedcord/core';

// justified: the registry only forwards these two into the service constructor
const plugin = { _register: vi.fn() } as unknown as Mongoose;
const core = {} as unknown as CoreBase;

const ADOPTED = `
import mongoose from 'mongoose';
import { MongooseService, RegisterMongooseService } from '${pluginsPath}';

@RegisterMongooseService('adopted')
export class Adopted extends MongooseService {
    public static schema = new mongoose.Schema({ username: { type: String, required: true } });
}
`;

describe('MongooseServiceRegistry model ownership', () => {
    let testEnv: TestEnvironment;
    let file: string;
    let registry: MongooseServiceRegistry;

    beforeEach(async () => {
        testEnv = new TestEnvironment('mongoose-registry-');
        await testEnv.setup();
        file = await testEnv.createFile('services/Adopted.ts', ADOPTED);
        registry = new MongooseServiceRegistry(plugin, core, new Logger('test'), testEnv.resolvePath('services'));
    });

    afterEach(async () => {
        for (const name of Object.keys(mongoose.models)) Reflect.deleteProperty(mongoose.models, name);
        vi.clearAllMocks();
        await testEnv.teardown();
    });

    // the same schema instance, so mongoose returns the existing model and never throws
    async function registerAdoptedElsewhere(): Promise<void> {
        const { Adopted } = (await import(pathToFileURL(file).href)) as { Adopted: { schema: mongoose.Schema } };
        mongoose.model('adopted', Adopted.schema);
    }

    it('leaves a model another component already registered out of its cleanup', async () => {
        await registerAdoptedElsewhere();
        await registry.load();

        registry.clearModels();
        await registry.onHmr({ file, type: 'delete' });

        expect(vi.mocked(mongoose.deleteModel)).not.toHaveBeenCalledWith('adopted');
    });

    it('deletes its own model on clearModels', async () => {
        await registry.load();

        registry.clearModels();

        expect(vi.mocked(mongoose.deleteModel)).toHaveBeenCalledWith('adopted');
    });

    it('deletes its own model when a save deletes the service file', async () => {
        await registry.load();

        await registry.onHmr({ file, type: 'delete' });

        expect(vi.mocked(mongoose.deleteModel)).toHaveBeenCalledWith('adopted');
    });
});
