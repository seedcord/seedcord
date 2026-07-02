import path from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Seedcord } from '@src/Seedcord';

import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-client';
import '../utils/mock-env';

const seedcordPath = path.resolve(__dirname, '../../src/index').replaceAll('\\', '/');

interface PrivateDispatcher {
    slashMap: Map<string, unknown>;
    init(): Promise<void>;
}

interface TestBot {
    interactions: PrivateDispatcher;
}

describe('interaction route metadata key isolation', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error Accessing private method for testing
        Seedcord.reset();
        testEnv = new TestEnvironment('metadata-keys-test-');
        await testEnv.setup();
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    it('a third-party write to the legacy string key does not hijack slash routing', async () => {
        await testEnv.createFile(
            'interactions/Mine.ts',
            `
            import { SlashHandler, SlashRoute } from '${seedcordPath}';

            @SlashRoute('mycmd')
            export class MyHandler extends SlashHandler<'mycmd'> {
                public async execute() {
                    await this.event.reply('ok');
                }
            }

            Reflect.defineMetadata('interaction:slash', ['hijacked'], MyHandler);
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath('interactions') });

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private interactions controller for assertion
        const controller = (seedcord.bot as unknown as TestBot).interactions;
        await controller.init();

        expect(controller.slashMap.has('mycmd')).toBe(true);
        expect(controller.slashMap.has('hijacked')).toBe(false);
    });
});
