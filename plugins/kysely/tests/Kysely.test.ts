import { setDevChannel } from '@seedcord/core/internal';
import { describe, expect, onTestFinished, vi } from 'vite-plus/test';

import { pluginsPath } from './utils/source-path';
import { it } from './utils/test-env';

describe('Kysely Plugin Integration', () => {
    it('should load kysely services from directory', async ({ kyselyWith, testEnv }) => {
        await testEnv.createFile(
            'services/UserService.ts',
            `
            import { KyselyService, RegisterKyselyService } from '${pluginsPath}';

            @RegisterKyselyService('users')
            export class UserService extends KyselyService {}
            `
        );
        const plugin = kyselyWith();

        const { services } = await plugin.codegen();
        expect(services.users?.name).toBe('UserService');

        await plugin.init();

        expect(plugin.services).toHaveProperty('users');
    });

    it('registers the migrations dir as a restart pattern', ({ kyselyWith }) => {
        const send = vi.fn();
        setDevChannel({ send, on: vi.fn(), off: vi.fn() });
        onTestFinished(() => setDevChannel(undefined));

        kyselyWith({ migrations: { path: './migrations' }, path: './services' });

        expect(send).toHaveBeenCalledWith('seedcord:register-critical-files', { patterns: ['migrations/**'] });
    });
});
