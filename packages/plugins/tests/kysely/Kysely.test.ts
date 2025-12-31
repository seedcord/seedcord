import path from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { KyselyPg } from '@src/kysely-pg/KyselyPg';

import { TestEnvironment } from '../utils/test-env';

import type { Core } from 'seedcord';

const pluginsPath = path.resolve(__dirname, '../../src/index').replace(/\\/g, '/');

describe('KyselyPg Plugin Integration', () => {
    let testEnv: TestEnvironment;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        // Simulate HMR update: Change key
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
});
