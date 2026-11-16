import mongoose from 'mongoose';
import { describe, expect, vi } from 'vite-plus/test';

import { pluginsPath } from './utils/source-path';
import { it } from './utils/test-env';

const USER_SERVICE = `
import { MongooseService, RegisterMongooseService } from '${pluginsPath}';
import mongoose from 'mongoose';

@RegisterMongooseService('users')
export class UserService extends MongooseService {
    public static schema = new mongoose.Schema({ name: String });

    public async findUser() {
        return 'user';
    }
}
`;

describe('Mongoose Plugin Integration', () => {
    it('should load mongoose services from directory', async ({ mongooseWith, testEnv }) => {
        await testEnv.createFile('services/UserService.ts', USER_SERVICE);
        const plugin = mongooseWith();

        const { services } = await plugin.codegen();
        expect(services.users?.name).toBe('UserService');

        await plugin.init();

        expect(plugin.services).toHaveProperty('users');
    });

    it('leaves a model it unregistered during HMR out of its later cleanup', async ({ mongooseWith, testEnv }) => {
        const filePath = await testEnv.createFile('services/UserService.ts', USER_SERVICE);
        const plugin = mongooseWith();

        await plugin.init();
        await plugin.onHmr({ file: filePath, type: 'delete' });

        expect(vi.mocked(mongoose.deleteModel)).toHaveBeenCalledWith('users');

        vi.mocked(mongoose.deleteModel).mockClear();
        await plugin.dispose();

        expect(vi.mocked(mongoose.deleteModel)).not.toHaveBeenCalledWith('users');
    });
});
