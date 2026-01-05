import path from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Seedcord } from '../../src/Seedcord';
import { TestEnvironment } from '../utils/test-env';

import type { Config } from '@seedcord/types';
import '../utils/mock-client';
import '../utils/mock-env';

const seedcordPath = path.resolve(__dirname, '../../src/index').replace(/\\/g, '/');

interface RegisteredEffectHandlerEntry {
    ctor: new (...args: unknown[]) => unknown;
    frequency: string;
}

interface PrivateEffectsController {
    effectsMap: Map<string, RegisteredEffectHandlerEntry[]>;
}

describe('EffectsController Integration', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error: Accessing private method for testing
        Seedcord.reset();
        testEnv = new TestEnvironment('effects-test-');
        await testEnv.setup();
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    it('should load effects from directory', async () => {
        const effectsDir = 'effects';
        await testEnv.createFile(
            `${effectsDir}/LogEffect.ts`,
            `
            import { EffectsHandler, RegisterEffect } from '${seedcordPath}';

            @RegisterEffect('unknownException')
            export class LogEffect extends EffectsHandler {
                public async execute() {
                    console.log('Effect executed');
                }
            }
            `
        );

        const config: Config = {
            bot: {
                events: { path: null },
                interactions: { path: null },
                commands: { path: null },
                clientOptions: { intents: [] }
            },
            effects: { path: testEnv.resolvePath(effectsDir) }
        };

        seedcord = new Seedcord(config);
        await seedcord.effects.init();

        // Access private effectsMap
        const controller = seedcord.effects as unknown as PrivateEffectsController;
        // unknownException has a default handler (UnknownException), plus our custom one = 2
        expect(controller.effectsMap.get('unknownException')).toHaveLength(2);
    });

    it('should handle HMR updates for effects', async () => {
        const effectsDir = 'effects';
        const filePath = await testEnv.createFile(
            `${effectsDir}/LogEffect.ts`,
            `
            import { EffectsHandler, RegisterEffect } from '${seedcordPath}';

            @RegisterEffect('unknownException')
            export class LogEffect extends EffectsHandler {
                public async execute() {
                    console.log('Effect executed');
                }
            }
            `
        );

        const config: Config = {
            bot: {
                events: { path: null },
                interactions: { path: null },
                commands: { path: null },
                clientOptions: { intents: [] }
            },
            effects: { path: testEnv.resolvePath(effectsDir) }
        };

        seedcord = new Seedcord(config);
        await seedcord.effects.init();

        let controller = seedcord.effects as unknown as PrivateEffectsController;
        const handlersBefore = controller.effectsMap.get('unknownException');

        expect(handlersBefore).toHaveLength(2);
        const customHandlerBefore = handlersBefore?.[1]?.ctor;

        // Simulate HMR update: Change effect implementation
        await testEnv.createFile(
            `${effectsDir}/LogEffect.ts`,
            `
            import { EffectsHandler, RegisterEffect } from '${seedcordPath}';

            @RegisterEffect('unknownException')
            export class LogEffect extends EffectsHandler {
                public async execute() {
                    console.log('Effect updated');
                }
            }
            `
        );

        await seedcord.effects.onHmr({
            file: filePath,
            type: 'update'
        });

        controller = seedcord.effects as unknown as PrivateEffectsController;
        const handlersAfter = controller.effectsMap.get('unknownException');

        expect(handlersAfter).toHaveLength(2);
        const customHandlerAfter = handlersAfter?.[1]?.ctor;
        expect(customHandlerAfter).not.toBe(customHandlerBefore);
        expect(customHandlerAfter?.name).toBe('LogEffect');
    });
});
