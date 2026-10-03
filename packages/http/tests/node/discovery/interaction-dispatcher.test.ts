import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolve } from '#src/dispatch/resolve';
import { InteractionDispatcher } from '#src/node/InteractionDispatcher';

import { ConfirmId } from './fixtures/handlers/ConfirmControls';

import type { APIInteraction } from 'discord-api-types/v10';

const HANDLERS_DIR = path.resolve(__dirname, './fixtures/handlers');

async function readyDispatcher(): Promise<InteractionDispatcher> {
    const dispatcher = new InteractionDispatcher(HANDLERS_DIR);
    await dispatcher.init();
    return dispatcher;
}

function slashPayload(name: string): APIInteraction {
    // justified: resolve only reads type and data
    return { type: 2, data: { type: 1, name, options: [] } } as unknown as APIInteraction;
}

function registeredClassName(dispatcher: InteractionDispatcher, payload: APIInteraction): string | null {
    const match = resolve(dispatcher.maps, payload);
    if (!match?.routeId) return null;
    return match.ctor.name;
}

describe('http InteractionDispatcher discovery', () => {
    it('registers a slash handler by its route path', async () => {
        const dispatcher = await readyDispatcher();

        expect(registeredClassName(dispatcher, slashPayload('ping'))).toBe('PingCommand');
    });

    it('registers a nested subcommand route from the decorator string', async () => {
        const dispatcher = await readyDispatcher();
        const payload = {
            type: 2,
            data: { type: 1, name: 'config', options: [{ type: 1, name: 'set', options: [] }] }
            // justified: resolve only reads type and data
        } as unknown as APIInteraction;

        expect(registeredClassName(dispatcher, payload)).toBe('ConfigSet');
    });

    it('registers a user context menu by name', async () => {
        const dispatcher = await readyDispatcher();
        // justified: resolve only reads type and data
        const payload = { type: 2, data: { type: 2, name: 'User Info' } } as unknown as APIInteraction;

        expect(registeredClassName(dispatcher, payload)).toBe('UserInfoMenu');
    });

    it('registers autocomplete as its own route', async () => {
        const dispatcher = await readyDispatcher();
        const payload = {
            type: 4,
            data: { type: 1, name: 'ban', options: [] }
            // justified: resolve only reads type and data
        } as unknown as APIInteraction;

        expect(registeredClassName(dispatcher, payload)).toBe('BanAutocomplete');
    });

    it('routes each class of a multi-handler file to its own row', async () => {
        const dispatcher = await readyDispatcher();
        const payload = {
            type: 3,
            data: { component_type: 2, custom_id: ConfirmId.encode({ subject: 'x' }) }
            // justified: resolve only reads type and data
        } as unknown as APIInteraction;

        expect(registeredClassName(dispatcher, payload)).toBe('ConfirmButton');
    });

    it('an unregistered route resolves to the unhandled default', async () => {
        const dispatcher = await readyDispatcher();

        const match = resolve(dispatcher.maps, slashPayload('missing'));
        expect(match?.routeId).toBeNull();
    });

    it('drops every route a handler owned when its file goes away', async () => {
        const dispatcher = await readyDispatcher();

        await dispatcher.onHmr({ type: 'delete', file: path.join(HANDLERS_DIR, 'PingCommand.ts') });

        const match = resolve(dispatcher.maps, slashPayload('ping'));
        expect(match?.routeId).toBeNull();
    });
});
