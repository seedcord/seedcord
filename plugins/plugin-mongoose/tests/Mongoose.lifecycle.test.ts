import { SeedcordErrorCode } from '@seedcord/errors';
import mongoose from 'mongoose';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Mongoose } from '@src/Mongoose';

import { TestEnvironment } from './utils/test-env';

import type { CoreBase } from '@seedcord/core';

describe('Mongoose lifecycle', () => {
    let testEnv: TestEnvironment;
    let mockCore: CoreBase;
    let servicesDir: string;

    beforeEach(async () => {
        testEnv = new TestEnvironment('mongoose-lifecycle-');
        await testEnv.setup();
        await testEnv.createFile('services/.keep', '');
        servicesDir = testEnv.resolvePath('services');
        mockCore = { config: {} } as unknown as CoreBase;
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    function build(timeout?: number): Mongoose {
        return new Mongoose(mockCore, {
            uri: 'mongodb://localhost:27017',
            name: 'test',
            dir: servicesDir,
            ...(timeout !== undefined && { timeout })
        });
    }

    it('throws when services is read before init', () => {
        const plugin = build();

        expect(() => plugin.services).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginMongooseServicesNotReady })
        );
    });

    it('connects once across repeated init calls', async () => {
        const plugin = build();

        await plugin.init();
        await plugin.init();

        expect(vi.mocked(mongoose.connect)).toHaveBeenCalledTimes(1);
    });

    it('exposes the connection and the services map once init resolves', async () => {
        const plugin = build();

        await plugin.init();

        expect(plugin.connection).toBeDefined();
        expect(plugin.services).toEqual({});
    });

    it('translates a connect failure into PluginMongooseConnectionFailed', async () => {
        vi.mocked(mongoose.connect).mockRejectedValueOnce(new Error('refused'));
        const plugin = build();

        await expect(plugin.init()).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginMongooseConnectionFailed })
        );
    });

    it('disconnects the live connection on dispose', async () => {
        const plugin = build();
        await plugin.init();
        const { connection } = plugin;

        await plugin.dispose();

        expect(vi.mocked(connection.disconnect)).toHaveBeenCalled();
    });

    it('disposes without throwing when init never ran', async () => {
        const plugin = build();

        await expect(plugin.dispose()).resolves.toBeUndefined();
    });
});
