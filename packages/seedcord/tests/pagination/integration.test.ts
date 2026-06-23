import path from 'node:path';

import { pageCursor } from '@seedcord/kit/internal';
import { ComponentType } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Seedcord } from '@src/Seedcord';

import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-client';
import '../utils/mock-env';

import type { APIContainerComponent } from 'discord.js';

const seedcordPath = path.resolve(__dirname, '../../src/index').replace(/\\/g, '/');

interface TestBot {
    interactions: {
        buttonMap: Map<string, unknown>;
        init(): Promise<void>;
        handleButton(interaction: unknown): Promise<void>;
    };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine for the mock
function fakeButton(customId: string) {
    return {
        customId,
        isAutocomplete: () => false,
        isButton: () => true,
        isChatInputCommand: () => false,
        isContextMenuCommand: () => false,
        isAnySelectMenu: () => false,
        isModalSubmit: () => false,
        deferUpdate: vi.fn().mockResolvedValue(undefined),
        message: { id: 'paged-message' },
        webhook: { editMessage: vi.fn().mockResolvedValue(undefined) },
        user: { id: 'u1' },
        guild: null,
        guildId: 'g1',
        channelId: 'c1',
        id: 'i1',
        deferred: false,
        replied: false
    };
}

function pageText(body: { components: { toJSON(): unknown }[] }): string {
    const json = body.components[0]?.toJSON() as APIContainerComponent;
    return json.components.reduce<string>(
        (acc, part) => (part.type === ComponentType.TextDisplay ? acc + part.content : acc),
        ''
    );
}

describe('Paginator end-to-end through the real dispatcher', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error reset the singleton between tests
        Seedcord.reset();
        testEnv = new TestEnvironment('pagination-e2e-');
        await testEnv.setup();
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    it('file-scans a paginator nav handler, routes a click, decodes the page, and edits in place', async () => {
        await testEnv.createFile(
            'interactions/Letters.ts',
            `
            import { Paginator, ArraySource, ButtonRoute } from '${seedcordPath}';

            export const Letters = new Paginator({
                prefix: 'e2e-letters',
                source: new ArraySource(() => ['a', 'b', 'c', 'd', 'e'], { perPage: 2 }),
                renderItem: (letter) => letter
            });

            @ButtonRoute(Letters.cursor)
            export class LettersNav extends Letters.Handler {}
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath('interactions') });
        seedcord = new Seedcord(config);
        const controller = (seedcord.bot as unknown as TestBot).interactions;
        await controller.init();

        // the file-scan discovered the paginator's minted nav handler and registered it by the cursor prefix.
        expect(controller.buttonMap.has('e2e-letters')).toBe(true);

        // a click minted from page 2's wire (pageCursor is deterministic, same prefix + layout) routes through.
        const click = fakeButton(pageCursor('e2e-letters').encode({ page: 2, slot: 0 }));
        await controller.handleButton(click);

        expect(click.deferUpdate).toHaveBeenCalledOnce();
        expect(click.webhook.editMessage).toHaveBeenCalledOnce();
        const [message, body] = click.webhook.editMessage.mock.calls[0] as [
            unknown,
            { components: { toJSON(): unknown }[] }
        ];
        expect(message).toBe(click.message);
        expect(pageText(body)).toBe('e'); // page 2 of 5 items at perPage 2
    });
});
