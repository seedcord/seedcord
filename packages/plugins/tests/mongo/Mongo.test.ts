import path from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Mongo } from '@src/mongo/Mongo';

import { TestEnvironment } from '../utils/test-env';

import type { Core } from 'seedcord';

const pluginsPath = path.resolve(__dirname, '../../src/index').replace(/\\/g, '/');

describe('Mongo Plugin Integration', () => {
    let testEnv: TestEnvironment;
    let mongo: Mongo;
    let mockCore: Core;

    beforeEach(async () => {
        testEnv = new TestEnvironment('mongo-test-');
        await testEnv.setup();
        mockCore = {
            shutdown: { addTask: vi.fn() },
            startup: { addTask: vi.fn() },
            config: {}
        } as unknown as Core;
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    it('should load mongo services from directory', async () => {
        const servicesDir = 'services';
        await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { MongoService, RegisterMongoService, RegisterMongoModel } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongoService('users')
            export class UserService extends MongoService {
                @RegisterMongoModel('users')
                public static schema = new mongoose.Schema({ name: String });

                public async findUser() {
                    return 'user';
                }
            }
            `
        );

        mongo = new Mongo(mockCore, {
            uri: 'mongodb://localhost:27017',
            name: 'test',
            dir: testEnv.resolvePath(servicesDir)
        });

        await mongo.init();

        expect(mongo.services).toHaveProperty('users');
    });

    it('should handle HMR updates for mongo services', async () => {
        const servicesDir = 'services';
        const filePath = await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { MongoService, RegisterMongoService, RegisterMongoModel } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongoService('users')
            export class UserService extends MongoService {
                @RegisterMongoModel('users')
                public static schema = new mongoose.Schema({ name: String });

                public async findUser() {
                    return 'user';
                }
            }
            `
        );

        mongo = new Mongo(mockCore, {
            uri: 'mongodb://localhost:27017',
            name: 'test',
            dir: testEnv.resolvePath(servicesDir)
        });

        await mongo.init();

        expect(mongo.services).toHaveProperty('users');

        // Simulate HMR update: Change key
        await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { MongoService, RegisterMongoService, RegisterMongoModel } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongoService('admins')
            export class UserService extends MongoService {
                @RegisterMongoModel('admins')
                public static schema = new mongoose.Schema({ name: String });

                public async findUser() {
                    return 'admin';
                }
            }
            `
        );

        await mongo.onHmr({
            file: filePath,
            type: 'update'
        });

        expect(mongo.services).not.toHaveProperty('users');
        expect(mongo.services).toHaveProperty('admins');
    });
});
