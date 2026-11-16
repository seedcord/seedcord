import { setDevChannel } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { describe, it, expect, beforeEach, afterEach, onTestFinished, vi } from 'vite-plus/test';

import { Kysely } from '#src/Kysely';

import { memorySqlite } from './utils/dialects';
import { pluginsPath } from './utils/source-path';
import { TestEnvironment } from './utils/test-env';

import type { CoreBase } from '@seedcord/core';

describe('Kysely Plugin Integration', () => {
    let testEnv: TestEnvironment;

    let plugin: Kysely;
    let mockCore: CoreBase;

    beforeEach(async () => {
        testEnv = new TestEnvironment('kysely-test-');
        await testEnv.setup();
        await testEnv.createFile('migrations/.keep', '');
        // the plugin never reads core. this only satisfies the constructor
        mockCore = { config: {} } as unknown as CoreBase;
    });

    afterEach(async () => {
        setDevChannel(undefined);
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    it('should load kysely services from directory', async () => {
        const servicesDir = 'services';
        await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

            @RegisterKyselyService('users')
            export class UserService extends KyselyService<any> {
                public async findUser() {
                    return 'user';
                }
            }
            `
        );

        plugin = new Kysely(mockCore, {
            dialect: memorySqlite,
            migrations: { dir: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath(servicesDir)
        });

        const { services } = await plugin.codegen();
        expect(services.users?.name).toBe('UserService');

        await plugin.init();

        expect(plugin.services).toHaveProperty('users');
    });

    it('warns once about a service class without the decorator and ignores the other exports', async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn');
        onTestFinished(() => warn.mockRestore());
        await testEnv.createFile(
            'services/Plain.ts',
            `
            import { KyselyService } from '${pluginsPath}';

            export class Plain extends KyselyService<any> {}
            export const LIMIT = 5;
            export function helper(): string {
                return 'not a service';
            }
            `
        );
        await testEnv.createFile('services/index.ts', "export { Plain } from './Plain';");
        plugin = new Kysely(mockCore, {
            dialect: memorySqlite,
            migrations: { dir: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath('services')
        });

        await plugin.init();

        expect(warn.mock.calls.map(([message]) => message)).toEqual([expect.stringContaining('Plain')]);
        expect(plugin.services).toEqual({});
    });

    it('should handle HMR updates for kysely services', async () => {
        const servicesDir = 'services';
        const filePath = await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

            @RegisterKyselyService('users')
            export class UserService extends KyselyService<any> {
                public async findUser() {
                    return 'user';
                }
            }
            `
        );

        plugin = new Kysely(mockCore, {
            dialect: memorySqlite,
            migrations: { dir: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath(servicesDir)
        });

        await plugin.init();

        expect(plugin.services).toHaveProperty('users');

        // HMR update that changes the registered key
        await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

            @RegisterKyselyService('admins')
            export class UserService extends KyselyService<any> {
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

    it('keeps other tracked services registered when one leaf reloads', async () => {
        const servicesDir = 'services';
        const userFile = await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

            @RegisterKyselyService('users')
            export class UserService extends KyselyService<any> {
                public async findUser() {
                    return 'user';
                }
            }
            `
        );
        await testEnv.createFile(
            `${servicesDir}/ProductService.ts`,
            `
            import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

            @RegisterKyselyService('products')
            export class ProductService extends KyselyService<any> {
                public async findProduct() {
                    return 'product';
                }
            }
            `
        );

        plugin = new Kysely(mockCore, {
            dialect: memorySqlite,
            migrations: { dir: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath(servicesDir)
        });

        await plugin.init();

        expect(plugin.services).toHaveProperty('users');
        expect(plugin.services).toHaveProperty('products');

        // reload only the user leaf
        await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

            @RegisterKyselyService('admins')
            export class UserService extends KyselyService<any> {
                public async findUser() {
                    return 'admin';
                }
            }
            `
        );

        await plugin.onHmr({ file: userFile, type: 'update' });

        // the single-leaf reload kept the store because the unchanged product leaf is still tracked
        expect(plugin.services).toHaveProperty('products');
        expect(plugin.services).toHaveProperty('admins');
        expect(plugin.services).not.toHaveProperty('users');
    });

    it('removes services registered by a failed init when the retry no longer finds them', async () => {
        const servicesDir = 'services';
        // this one registers before the broken file aborts the scan. A sorts before Z
        await testEnv.createFile(
            `${servicesDir}/AUserService.ts`,
            `
            import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

            @RegisterKyselyService('users')
            export class AUserService extends KyselyService<any> {}
            `
        );
        await testEnv.createFile(`${servicesDir}/ZBroken.ts`, 'export const broken = {{{ not valid');

        plugin = new Kysely(mockCore, {
            dialect: memorySqlite,
            migrations: { dir: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath(servicesDir)
        });

        await expect(plugin.init()).rejects.toThrow();

        await testEnv.removeFile(`${servicesDir}/AUserService.ts`);
        await testEnv.createFile(
            `${servicesDir}/ZBroken.ts`,
            `
            import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

            @RegisterKyselyService('products')
            export class ZProductService extends KyselyService<any> {}
            `
        );

        await plugin.init();

        expect(plugin.services).toHaveProperty('products');
        expect(plugin.services).not.toHaveProperty('users');
    });

    it('keeps the last-good service when a reload throws', async () => {
        const servicesDir = 'services';
        const userFile = await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

            @RegisterKyselyService('users')
            export class UserService extends KyselyService<any> {
                public async findUser() {
                    return 'user';
                }
            }
            `
        );

        plugin = new Kysely(mockCore, {
            dialect: memorySqlite,
            migrations: { dir: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath(servicesDir)
        });

        await plugin.init();
        expect(plugin.services).toHaveProperty('users');

        // a broken edit, the reload import throws
        await testEnv.createFile(`${servicesDir}/UserService.ts`, 'export const broken = {{{ not valid');
        await plugin.onHmr({ file: userFile, type: 'update' });

        // the last-good service round-trips and is still registered since the failed reload rolled back
        expect(plugin.services).toHaveProperty('users');
    });

    it('registers the migrations dir as a restart pattern', () => {
        const send = vi.fn();
        setDevChannel({ send, on: vi.fn(), off: vi.fn() });

        plugin = new Kysely(mockCore, {
            dialect: memorySqlite,
            migrations: { dir: './migrations' },
            dir: './services'
        });

        expect(send).toHaveBeenCalledWith('seedcord:register-critical-files', { patterns: ['migrations/**'] });
    });
});
