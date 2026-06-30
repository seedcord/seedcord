import path from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { KyselyPg } from '@src/kysely-pg/KyselyPg';

import { TestEnvironment } from '../utils/test-env';

import type { Core } from 'seedcord';

const pluginsPath = path.resolve(__dirname, '../../src/index').replace(/\\/g, '/');

describe('KyselyPg Plugin Integration', () => {
    let testEnv: TestEnvironment;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture, the Database type param is irrelevant
    let kyselyPg: KyselyPg<any>;
    let mockCore: Core;

    beforeEach(async () => {
        testEnv = new TestEnvironment('kysely-test-');
        await testEnv.setup();
        await testEnv.createFile('migrations/.keep', '');
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

    it('should load kysely services from directory', async () => {
        const servicesDir = 'services';
        await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { KpgService, RegisterKpgService } from '${pluginsPath}';

            @RegisterKpgService('users')
            export class UserService extends KpgService<any> {
                public async findUser() {
                    return 'user';
                }
            }
            `
        );

        kyselyPg = new KyselyPg(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath(servicesDir)
        });

        await kyselyPg.init();

        expect(kyselyPg.services).toHaveProperty('users');
    });

    it('should handle HMR updates for kysely services', async () => {
        const servicesDir = 'services';
        const filePath = await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { KpgService, RegisterKpgService } from '${pluginsPath}';

            @RegisterKpgService('users')
            export class UserService extends KpgService<any> {
                public async findUser() {
                    return 'user';
                }
            }
            `
        );

        kyselyPg = new KyselyPg(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath(servicesDir)
        });

        await kyselyPg.init();

        expect(kyselyPg.services).toHaveProperty('users');

        // HMR update that changes the registered key
        await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { KpgService, RegisterKpgService } from '${pluginsPath}';

            @RegisterKpgService('admins')
            export class UserService extends KpgService<any> {
                public async findUser() {
                    return 'admin';
                }
            }
            `
        );

        await kyselyPg.onHmr({
            file: filePath,
            type: 'update'
        });

        expect(kyselyPg.services).not.toHaveProperty('users');
        expect(kyselyPg.services).toHaveProperty('admins');
    });

    it('keeps other tracked services registered when one leaf reloads', async () => {
        const servicesDir = 'services';
        const userFile = await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { KpgService, RegisterKpgService } from '${pluginsPath}';

            @RegisterKpgService('users')
            export class UserService extends KpgService<any> {
                public async findUser() {
                    return 'user';
                }
            }
            `
        );
        await testEnv.createFile(
            `${servicesDir}/ProductService.ts`,
            `
            import { KpgService, RegisterKpgService } from '${pluginsPath}';

            @RegisterKpgService('products')
            export class ProductService extends KpgService<any> {
                public async findProduct() {
                    return 'product';
                }
            }
            `
        );

        kyselyPg = new KyselyPg(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath(servicesDir)
        });

        await kyselyPg.init();

        expect(kyselyPg.services).toHaveProperty('users');
        expect(kyselyPg.services).toHaveProperty('products');

        // reload only the user leaf
        await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { KpgService, RegisterKpgService } from '${pluginsPath}';

            @RegisterKpgService('admins')
            export class UserService extends KpgService<any> {
                public async findUser() {
                    return 'admin';
                }
            }
            `
        );

        await kyselyPg.onHmr({ file: userFile, type: 'update' });

        // the unchanged product leaf is still tracked, so the store survived the single-leaf reload
        expect(kyselyPg.services).toHaveProperty('products');
        expect(kyselyPg.services).toHaveProperty('admins');
        expect(kyselyPg.services).not.toHaveProperty('users');
    });

    it('keeps the last-good service when a reload throws', async () => {
        const servicesDir = 'services';
        const userFile = await testEnv.createFile(
            `${servicesDir}/UserService.ts`,
            `
            import { KpgService, RegisterKpgService } from '${pluginsPath}';

            @RegisterKpgService('users')
            export class UserService extends KpgService<any> {
                public async findUser() {
                    return 'user';
                }
            }
            `
        );

        kyselyPg = new KyselyPg(mockCore, {
            connectionString: 'postgres://localhost:5432/test',
            migrations: { path: testEnv.resolvePath('migrations') },
            dir: testEnv.resolvePath(servicesDir)
        });

        await kyselyPg.init();
        expect(kyselyPg.services).toHaveProperty('users');

        // a broken edit, the reload import throws
        await testEnv.createFile(`${servicesDir}/UserService.ts`, 'export const broken = {{{ not valid');
        await kyselyPg.onHmr({ file: userFile, type: 'update' });

        // the failed reload rolled back, so the last-good service round-trips and stays registered
        expect(kyselyPg.services).toHaveProperty('users');
    });
});
