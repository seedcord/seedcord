import { setDevChannel } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { describe, expect, onTestFinished, vi } from 'vite-plus/test';

import { pluginsPath } from './utils/source-path';
import { it } from './utils/test-env';

const USER_SERVICE = `
import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

@RegisterKyselyService('users')
export class UserService extends KyselyService<any> {
    public async findUser() {
        return 'user';
    }
}
`;

const ADMIN_SERVICE = `
import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

@RegisterKyselyService('admins')
export class UserService extends KyselyService<any> {
    public async findUser() {
        return 'admin';
    }
}
`;

describe('Kysely Plugin Integration', () => {
    it('should load kysely services from directory', async ({ kyselyWith, testEnv }) => {
        await testEnv.createFile('services/UserService.ts', USER_SERVICE);
        const plugin = kyselyWith();

        const { services } = await plugin.codegen();
        expect(services.users?.name).toBe('UserService');

        await plugin.init();

        expect(plugin.services).toHaveProperty('users');
    });

    it('warns once about a service class without the decorator and ignores the other exports', async ({
        kyselyWith,
        testEnv
    }) => {
        using warn = vi.spyOn(Logger.prototype, 'warn');
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
        const plugin = kyselyWith();

        await plugin.init();

        expect(warn.mock.calls.map(([message]) => message)).toEqual([expect.stringContaining('Plain')]);
        expect(plugin.services).toEqual({});
    });

    it('should handle HMR updates for kysely services', async ({ kyselyWith, testEnv }) => {
        const filePath = await testEnv.createFile('services/UserService.ts', USER_SERVICE);
        const plugin = kyselyWith();
        await plugin.init();
        expect(plugin.services).toHaveProperty('users');

        // HMR update that changes the registered key
        await testEnv.createFile('services/UserService.ts', ADMIN_SERVICE);
        await plugin.onHmr({ file: filePath, type: 'update' });

        expect(plugin.services).not.toHaveProperty('users');
        expect(plugin.services).toHaveProperty('admins');
    });

    it('keeps other tracked services registered when one leaf reloads', async ({ kyselyWith, testEnv }) => {
        const userFile = await testEnv.createFile('services/UserService.ts', USER_SERVICE);
        await testEnv.createFile(
            'services/ProductService.ts',
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
        const plugin = kyselyWith();
        await plugin.init();
        expect(plugin.services).toHaveProperty('users');
        expect(plugin.services).toHaveProperty('products');

        // reload only the user leaf
        await testEnv.createFile('services/UserService.ts', ADMIN_SERVICE);
        await plugin.onHmr({ file: userFile, type: 'update' });

        // the single-leaf reload kept the store because the unchanged product leaf is still tracked
        expect(plugin.services).toHaveProperty('products');
        expect(plugin.services).toHaveProperty('admins');
        expect(plugin.services).not.toHaveProperty('users');
    });

    it('removes services registered by a failed init when the retry no longer finds them', async ({
        kyselyWith,
        testEnv
    }) => {
        // this one registers before the broken file aborts the scan. A sorts before Z
        await testEnv.createFile(
            'services/AUserService.ts',
            `
            import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

            @RegisterKyselyService('users')
            export class AUserService extends KyselyService<any> {}
            `
        );
        await testEnv.createFile('services/ZBroken.ts', 'export const broken = {{{ not valid');
        const plugin = kyselyWith();

        await expect(plugin.init()).rejects.toThrow();

        await testEnv.removeFile('services/AUserService.ts');
        await testEnv.createFile(
            'services/ZBroken.ts',
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

    it('keeps the last-good service when a reload throws', async ({ kyselyWith, testEnv }) => {
        const userFile = await testEnv.createFile('services/UserService.ts', USER_SERVICE);
        const plugin = kyselyWith();
        await plugin.init();
        expect(plugin.services).toHaveProperty('users');

        // a broken edit, the reload import throws
        await testEnv.createFile('services/UserService.ts', 'export const broken = {{{ not valid');
        await plugin.onHmr({ file: userFile, type: 'update' });

        // the last-good service round-trips and is still registered since the failed reload rolled back
        expect(plugin.services).toHaveProperty('users');
    });

    it('registers the migrations dir as a restart pattern', ({ kyselyWith }) => {
        const send = vi.fn();
        setDevChannel({ send, on: vi.fn(), off: vi.fn() });
        onTestFinished(() => setDevChannel(undefined));

        kyselyWith({ migrations: { dir: './migrations' }, dir: './services' });

        expect(send).toHaveBeenCalledWith('seedcord:register-critical-files', { patterns: ['migrations/**'] });
    });
});
