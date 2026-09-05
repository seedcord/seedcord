import { InteractionKind } from '@seedcord/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { interactionsOf } from '#bot/Bot';
import { Seedcord } from '#src/Seedcord';

import { seedcordPath } from '../utils/source-path';
import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-env';

interface PrivateDispatcher {
    maps: Record<InteractionKind, Map<string, unknown>>;
    init(): Promise<void>;
}

// justified: slashMap is private on the dispatcher
function dispatcherOf(instance: Seedcord): PrivateDispatcher {
    return interactionsOf(instance.bot) as unknown as PrivateDispatcher;
}

describe('interaction route metadata key isolation', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error reset the Seedcord singleton between tests
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
        const controller = dispatcherOf(seedcord);
        await controller.init();

        expect(controller.maps[InteractionKind.Slash].has('mycmd')).toBe(true);
        expect(controller.maps[InteractionKind.Slash].has('hijacked')).toBe(false);
    });
});
