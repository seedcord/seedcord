import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { KyselyPostgres } from '@src/KyselyPostgres';

import { pluginsPath } from './utils/source-path';
import { TestEnvironment } from './utils/test-env';

import type { CoreBase } from '@seedcord/core';

describe('KyselyPostgres Plugin Integration', () => {
    let testEnv: TestEnvironment;

    let plugin: KyselyPostgres;
    let mockCore: CoreBase;

    beforeEach(async () => {
        testEnv = new TestEnvironment('kysely-postgres-test-');
        await testEnv.setup();
        await testEnv.createFile('migrations/.keep', '');
        // the plugin reads nothing off core, this only satisfies the constructor
        mockCore = { config: {} } as unknown as CoreBase;
    });

    afterEach(async () => {
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

        plugin = new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath(servicesDir)
        });

        await plugin.init();

        expect(plugin.services).toHaveProperty('users');
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

        plugin = new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
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

        plugin = new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
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

        // the unchanged product leaf is still tracked, so the store survived the single-leaf reload
        expect(plugin.services).toHaveProperty('products');
        expect(plugin.services).toHaveProperty('admins');
        expect(plugin.services).not.toHaveProperty('users');
    });

    it('drops services registered by a failed init when the retry no longer finds them', async () => {
        const servicesDir = 'services';
        // A sorts before Z, so this one registers before the broken file aborts the scan
        await testEnv.createFile(
            `${servicesDir}/AUserService.ts`,
            `
            import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

            @RegisterKyselyService('users')
            export class AUserService extends KyselyService<any> {}
            `
        );
        await testEnv.createFile(`${servicesDir}/ZBroken.ts`, 'export const broken = {{{ not valid');

        plugin = new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
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

        plugin = new KyselyPostgres(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath(servicesDir)
        });

        await plugin.init();
        expect(plugin.services).toHaveProperty('users');

        // a broken edit, the reload import throws
        await testEnv.createFile(`${servicesDir}/UserService.ts`, 'export const broken = {{{ not valid');
        await plugin.onHmr({ file: userFile, type: 'update' });

        // the failed reload rolled back, so the last-good service round-trips and stays registered
        expect(plugin.services).toHaveProperty('users');
    });
});
