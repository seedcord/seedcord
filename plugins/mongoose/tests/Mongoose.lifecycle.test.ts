import { SeedcordErrorCode } from '@seedcord/errors';
import mongoose from 'mongoose';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Mongoose } from '@src/Mongoose';

import { pluginsPath } from './utils/source-path';
import { TestEnvironment } from './utils/test-env';

import type { CoreBase } from '@seedcord/core';

describe('Mongoose lifecycle', () => {
    let testEnv: TestEnvironment;
    let mockCore: CoreBase;
    let servicesDir: string;

    beforeEach(async () => {
        testEnv = new TestEnvironment('mongoose-lifecycle-');
        await testEnv.setup();
        await testEnv.createFile('services/.keep', '');
        servicesDir = testEnv.resolvePath('services');
        // justified: just to satisfy the constructor
        mockCore = { config: {} } as unknown as CoreBase;
    });

    afterEach(async () => {
        await testEnv.teardown();
        // the mongoose mock is module-level, so a leaked model goes into the the next test
        for (const name of Object.keys(mongoose.models)) Reflect.deleteProperty(mongoose.models, name);
        vi.clearAllMocks();
    });

    function build(timeout?: number): Mongoose {
        return new Mongoose(mockCore, {
            uri: 'mongodb://localhost:27017',
            name: 'test',
            dir: servicesDir,
            ...(timeout !== undefined && { timeout })
        });
    }

    it('closes the connection when service loading fails after connecting', async () => {
        const plugin = new Mongoose(mockCore, {
            uri: 'mongodb://localhost:27017',
            name: 'test',
            dir: testEnv.resolvePath('absent')
        });

        await expect(plugin.init()).rejects.toThrow();

        expect(vi.mocked(plugin.connection.disconnect)).toHaveBeenCalled();
    });

    it('keeps the init failure when the cleanup disconnect also fails', async () => {
        const plugin = new Mongoose(mockCore, {
            uri: 'mongodb://localhost:27017',
            name: 'test',
            dir: testEnv.resolvePath('absent')
        });
        const connection = await mongoose.connect('');
        vi.mocked(connection.disconnect).mockRejectedValueOnce(new Error('still busy'));

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreDirectoryUnreadable })
        );
    });

    it('clears its own model on dispose', async () => {
        await testEnv.createFile(
            'services/UserService.ts',
            `
            import { MongooseService, RegisterMongooseService, RegisterMongooseModel } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongooseService('users')
            export class UserService extends MongooseService {
                @RegisterMongooseModel('users')
                public static schema = new mongoose.Schema({ name: String });
            }
            `
        );
        const plugin = build();

        await plugin.init();
        await plugin.dispose();

        expect(vi.mocked(mongoose.deleteModel)).toHaveBeenCalledWith('users');
    });

    it('leaves a model it never registered alone', async () => {
        mongoose.models.foreign = { modelName: 'foreign' } as unknown as mongoose.Model<unknown>;
        const plugin = build();

        await plugin.init();
        await plugin.dispose();

        expect(vi.mocked(mongoose.deleteModel)).not.toHaveBeenCalledWith('foreign');
    });

    it('throws when services is read before init', () => {
        const plugin = build();

        expect(() => plugin.services).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginMongooseServicesNotReady })
        );
    });

    it('connects once across repeated init calls', async () => {
        const plugin = build();

        await plugin.init();
        await plugin.init();

        expect(vi.mocked(mongoose.connect)).toHaveBeenCalledTimes(1);
    });

    it('exposes the connection and the services map once init resolves', async () => {
        const plugin = build();

        await plugin.init();

        expect(plugin.connection).toBeDefined();
        expect(plugin.services).toEqual({});
    });

    it('translates a connect failure into PluginMongooseConnectionFailed', async () => {
        vi.mocked(mongoose.connect).mockRejectedValueOnce(new Error('refused'));
        const plugin = build();

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginMongooseConnectionFailed })
        );
    });

    it('drops services registered by a failed init when the retry no longer finds them', async () => {
        // A sorts before Z, so this one registers before the broken file aborts the scan
        await testEnv.createFile(
            'services/AUserService.ts',
            `
            import { MongooseService, RegisterMongooseService, RegisterMongooseModel } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongooseService('users')
            export class AUserService extends MongooseService {
                @RegisterMongooseModel('users')
                public static schema = new mongoose.Schema({ name: String });
            }
            `
        );
        await testEnv.createFile('services/ZBroken.ts', 'export const broken = {{{ not valid');
        const plugin = build();

        await expect(plugin.init()).rejects.toThrow();

        await testEnv.removeFile('services/AUserService.ts');
        await testEnv.createFile('services/ZBroken.ts', 'export const fine = 1;');

        await plugin.init();

        expect(plugin.services).not.toHaveProperty('users');
    });

    it('connects once when two callers race init', async () => {
        const plugin = build();

        await Promise.all([plugin.init(), plugin.init()]);

        expect(vi.mocked(mongoose.connect)).toHaveBeenCalledTimes(1);
    });

    it('retries after a failed init', async () => {
        vi.mocked(mongoose.connect).mockRejectedValueOnce(new Error('refused'));
        const plugin = build();
        await expect(plugin.init()).rejects.toThrow();

        await plugin.init();

        expect(plugin.services).toEqual({});
    });

    it('disconnects the live connection on dispose', async () => {
        const plugin = build();
        await plugin.init();
        const { connection } = plugin;

        await plugin.dispose();

        expect(vi.mocked(connection.disconnect)).toHaveBeenCalled();
    });

    it('disposes without throwing when init never ran', async () => {
        const plugin = build();

        await expect(plugin.dispose()).resolves.toBeUndefined();
    });

    it('translates a disconnect failure into PluginMongooseDisconnectFailed', async () => {
        const plugin = build();
        await plugin.init();
        vi.mocked(plugin.connection.disconnect).mockRejectedValueOnce(new Error('still busy'));

        await expect(plugin.dispose()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginMongooseDisconnectFailed })
        );
    });
});
