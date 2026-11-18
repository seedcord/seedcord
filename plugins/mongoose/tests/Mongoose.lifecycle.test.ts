import { pathToFileURL } from 'node:url';

import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import mongoose from 'mongoose';
import { describe, expect, vi } from 'vite-plus/test';

import { pluginsPath } from './utils/source-path';
import { it } from './utils/test-env';

describe('Mongoose lifecycle', () => {
    it('closes the connection when service loading fails after connecting', async ({ mongooseWith, testEnv }) => {
        const plugin = mongooseWith({ path: testEnv.resolvePath('absent') });
        const connection = await mongoose.connect('');

        await expect(plugin.init()).rejects.toThrow();

        expect(vi.mocked(connection.disconnect)).toHaveBeenCalled();
    });

    it('keeps the init failure when the cleanup disconnect also fails', async ({ mongooseWith, testEnv }) => {
        const plugin = mongooseWith({ path: testEnv.resolvePath('absent') });
        const connection = await mongoose.connect('');
        vi.mocked(connection.disconnect).mockRejectedValueOnce(new Error('still busy'));

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePathUnreadable })
        );
    });

    it('clears its own model on dispose', async ({ mongooseWith, testEnv }) => {
        await testEnv.createFile(
            'services/UserService.ts',
            `
            import { MongooseService, RegisterMongooseService } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongooseService('users')
            export class UserService extends MongooseService {
                public static schema = new mongoose.Schema({ name: String });
            }
            `
        );
        const plugin = mongooseWith();

        await plugin.init();
        await plugin.dispose();

        expect(vi.mocked(mongoose.deleteModel)).toHaveBeenCalledWith('users');
    });

    describe('model registration', () => {
        it('takes the model name from the modelName override when the key differs', async ({
            mongooseWith,
            testEnv
        }) => {
            await testEnv.createFile(
                'services/UserService.ts',
                `
            import { MongooseService, RegisterMongooseService } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongooseService('users', { modelName: 'app_users' })
            export class UserService extends MongooseService {
                public static schema = new mongoose.Schema({ name: String });
            }
            `
            );
            const plugin = mongooseWith();

            await plugin.init();
            await plugin.dispose();

            expect(vi.mocked(mongoose.deleteModel)).toHaveBeenCalledWith('app_users');
        });

        it('translates a duplicate model name into PluginMongooseModelCreationFailed', async ({
            mongooseWith,
            testEnv
        }) => {
            for (const name of ['AFirst', 'BSecond']) {
                await testEnv.createFile(
                    `services/${name}.ts`,
                    `
                import { MongooseService, RegisterMongooseService } from '${pluginsPath}';
                import mongoose from 'mongoose';

                @RegisterMongooseService('${name.toLowerCase()}', { modelName: 'users' })
                export class ${name} extends MongooseService {
                    public static schema = new mongoose.Schema({ name: String });
                }
                `
                );
            }
            const plugin = mongooseWith();

            await expect(plugin.init()).rejects.toThrow(
                expect.objectContaining({ code: SeedcordErrorCode.PluginMongooseModelCreationFailed })
            );
        });

        it('builds the model from the schema on the service class', async ({ mongooseWith, testEnv }) => {
            await testEnv.createFile(
                'services/UserService.ts',
                `
            import { MongooseService, RegisterMongooseService } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongooseService('users')
            export class UserService extends MongooseService {
                public static schema = new mongoose.Schema({ name: String });
            }
            `
            );
            const plugin = mongooseWith();

            await plugin.init();

            expect(vi.mocked(mongoose.model)).toHaveBeenCalledWith('users', expect.any(mongoose.Schema));
        });

        it('builds the model after the connection opens', async ({ mongooseWith, testEnv }) => {
            await testEnv.createFile(
                'services/UserService.ts',
                `
            import { MongooseService, RegisterMongooseService } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongooseService('users')
            export class UserService extends MongooseService {
                public static schema = new mongoose.Schema({ name: String });
            }
            `
            );
            const plugin = mongooseWith();

            await plugin.init();

            const connectOrder = vi.mocked(mongoose.connect).mock.invocationCallOrder[0];
            const modelOrder = vi.mocked(mongoose.model).mock.invocationCallOrder[0];
            expect(connectOrder).toBeLessThan(modelOrder!);
        });
    });

    it('leaves a model it never registered alone', async ({ mongooseWith }) => {
        mongoose.models.foreign = { modelName: 'foreign' } as unknown as mongoose.Model<unknown>;
        const plugin = mongooseWith();

        await plugin.init();
        await plugin.dispose();

        expect(vi.mocked(mongoose.deleteModel)).not.toHaveBeenCalledWith('foreign');
    });

    it('leaves the model of a service that another component registered first', async ({ mongooseWith, testEnv }) => {
        const file = await testEnv.createFile(
            'services/Adopted.ts',
            `
            import { MongooseService, RegisterMongooseService } from '${pluginsPath}';
            import mongoose from 'mongoose';

            @RegisterMongooseService('adopted')
            export class Adopted extends MongooseService {
                public static schema = new mongoose.Schema({ username: { type: String, required: true } });
            }
            `
        );
        const { Adopted } = (await import(pathToFileURL(file).href)) as { Adopted: { schema: mongoose.Schema } };
        // mongoose hands back the existing model for the same schema instance
        mongoose.model('adopted', Adopted.schema);
        const plugin = mongooseWith();

        await plugin.init();
        expect(plugin.services).toHaveProperty('adopted');
        await plugin.onHmr({ file, type: 'delete' });
        await plugin.dispose();

        expect(vi.mocked(mongoose.deleteModel)).not.toHaveBeenCalledWith('adopted');
    });

    it.for(['services', 'connection'] as const)('throws when %s is read before init', (member, { mongooseWith }) => {
        const plugin = mongooseWith();

        expect(() => plugin[member]).toThrow(expect.objectContaining({ code: SeedcordErrorCode.PluginNotReady }));
    });

    it('exposes the connection and the services map once init resolves', async ({ mongooseWith }) => {
        const plugin = mongooseWith();

        await plugin.init();

        expect(plugin.connection).toBeDefined();
        expect(plugin.services).toEqual({});
    });

    it('translates a connect failure into PluginConnectionFailed with the driver message', async ({ mongooseWith }) => {
        vi.mocked(mongoose.connect).mockRejectedValueOnce(new Error('refused'));
        const plugin = mongooseWith();

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({
                code: SeedcordErrorCode.PluginConnectionFailed,
                message: expect.stringContaining('refused') as string
            })
        );
    });

    it('stops looking for a server after 10 seconds so a dead one fails init with the driver error', async ({
        mongooseWith
    }) => {
        await mongooseWith().init();

        expect(vi.mocked(mongoose.connect)).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ serverSelectionTimeoutMS: 10_000 })
        );
    });

    it('keeps a serverSelectionTimeoutMS from connectionOptions', async ({ mongooseWith }) => {
        await mongooseWith({ connectionOptions: { serverSelectionTimeoutMS: 2000 } }).init();

        expect(vi.mocked(mongoose.connect)).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ serverSelectionTimeoutMS: 2000 })
        );
    });

    it('retries after a failed init', async ({ mongooseWith }) => {
        vi.mocked(mongoose.connect).mockRejectedValueOnce(new Error('refused'));
        const plugin = mongooseWith();
        await expect(plugin.init()).rejects.toThrow();

        await plugin.init();

        expect(plugin.services).toEqual({});
    });

    it('disconnects the live connection on dispose', async ({ mongooseWith }) => {
        const plugin = mongooseWith();
        await plugin.init();
        const { connection } = plugin;

        await plugin.dispose();

        expect(vi.mocked(connection.disconnect)).toHaveBeenCalled();
    });

    it('reconnects when init runs after dispose', async ({ mongooseWith }) => {
        const plugin = mongooseWith();
        await plugin.init();
        await plugin.dispose();
        vi.mocked(mongoose.connect).mockClear();

        await plugin.init();

        expect(vi.mocked(mongoose.connect)).toHaveBeenCalled();
    });

    it.for(['services', 'connection'] as const)(
        'reports %s unavailable after dispose',
        async (member, { mongooseWith }) => {
            const plugin = mongooseWith();
            await plugin.init();

            await plugin.dispose();

            expect(() => plugin[member]).toThrow(expect.objectContaining({ code: SeedcordErrorCode.PluginNotReady }));
        }
    );

    it('disposes without throwing when init never ran', async ({ mongooseWith }) => {
        const plugin = mongooseWith();

        await expect(plugin.dispose()).resolves.toBeUndefined();
    });

    it('throws PluginDisconnectFailed on a disconnect failure without logging it too', async ({ mongooseWith }) => {
        const plugin = mongooseWith();
        await plugin.init();
        vi.mocked(plugin.connection.disconnect).mockRejectedValueOnce(new Error('still busy'));
        using logged = vi.spyOn(Logger.prototype, 'error');

        await expect(plugin.dispose()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginDisconnectFailed })
        );
        expect(logged).not.toHaveBeenCalled();
    });
});
