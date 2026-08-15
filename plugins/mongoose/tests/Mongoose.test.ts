import mongoose from 'mongoose';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Mongoose } from '#src/Mongoose';

import { pluginsPath } from './utils/source-path';
import { TestEnvironment } from './utils/test-env';

import type { CoreBase } from '@seedcord/core';

describe('Mongoose Plugin Integration', () => {
    let testEnv: TestEnvironment;
    let plugin: Mongoose;
    let mockCore: CoreBase;

    beforeEach(async () => {
        testEnv = new TestEnvironment('mongoose-test-');
        await testEnv.setup();
        // justified: just to satisfy the constructor
        mockCore = { config: {} } as unknown as CoreBase;
    });

    afterEach(async () => {
        await testEnv.teardown();
        // the mongoose mock is module-level, so a leaked model goes into the next test
        for (const name of Object.keys(mongoose.models)) Reflect.deleteProperty(mongoose.models, name);
        vi.clearAllMocks();
    });

    it('should load mongoose services from directory', async () => {
        const servicesDir = 'services';
        await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { MongooseService, RegisterMongooseService } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongooseService('users')
            export class UserService extends MongooseService {
                public static schema = new mongoose.Schema({ name: String });

                public async findUser() {
                    return 'user';
                }
            }
            `
        );

        plugin = new Mongoose(mockCore, {
            uri: 'mongodb://localhost:27017',
            name: 'test',
            dir: testEnv.resolvePath(servicesDir)
        });

        await plugin.init();

        expect(plugin.services).toHaveProperty('users');
    });

    it('should handle HMR updates for mongoose services', async () => {
        const servicesDir = 'services';
        const filePath = await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { MongooseService, RegisterMongooseService } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongooseService('users')
            export class UserService extends MongooseService {
                public static schema = new mongoose.Schema({ name: String });

                public async findUser() {
                    return 'user';
                }
            }
            `
        );

        plugin = new Mongoose(mockCore, {
            uri: 'mongodb://localhost:27017',
            name: 'test',
            dir: testEnv.resolvePath(servicesDir)
        });

        await plugin.init();

        expect(plugin.services).toHaveProperty('users');

        // Simulate HMR update: Change key
        await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { MongooseService, RegisterMongooseService } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongooseService('admins')
            export class UserService extends MongooseService {
                public static schema = new mongoose.Schema({ name: String });

                public async findUser() {
                    return 'admin';
                }
            }
            `
        );

        await plugin.onHmr({
            file: filePath,
            type: 'update'
        });

        expect(plugin.services).not.toHaveProperty('users');
        expect(plugin.services).toHaveProperty('admins');
    });

    it('drops a model it unregistered during HMR from its later cleanup', async () => {
        const servicesDir = 'services';
        const filePath = await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { MongooseService, RegisterMongooseService } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongooseService('users')
            export class UserService extends MongooseService {
                public static schema = new mongoose.Schema({ name: String });
            }
            `
        );

        plugin = new Mongoose(mockCore, {
            uri: 'mongodb://localhost:27017',
            name: 'test',
            dir: testEnv.resolvePath(servicesDir)
        });

        await plugin.init();
        await plugin.onHmr({ file: filePath, type: 'delete' });

        expect(vi.mocked(mongoose.deleteModel)).toHaveBeenCalledWith('users');

        vi.mocked(mongoose.deleteModel).mockClear();
        await plugin.dispose();

        expect(vi.mocked(mongoose.deleteModel)).not.toHaveBeenCalledWith('users');
    });
});
