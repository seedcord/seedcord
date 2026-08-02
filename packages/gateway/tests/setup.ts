import 'reflect-metadata';

import { vi } from 'vitest';

// the default reporters require these at boot
process.env.UNKNOWN_EXCEPTION_WEBHOOK_URL ??= 'https://discord.com/api/webhooks/1/aaa';
process.env.HANDLED_EXCEPTION_WEBHOOK_URL ??= 'https://discord.com/api/webhooks/2/bbb';

// fresh per construction, a shared object accumulates listeners across tests
function buildMockClient(): unknown {
    return {
        on: vi.fn(),
        once: vi.fn(),
        emit: vi.fn(),
        removeAllListeners: vi.fn(),
        login: vi.fn().mockResolvedValue('mock-token'),
        destroy: vi.fn().mockResolvedValue(undefined),
        user: {
            id: 'mock-bot-id',
            tag: 'MockBot#1234'
        },
        // the command deploy reads application.id and PUTs through rest
        application: {
            id: 'mock-app-id'
        },
        rest: {
            put: vi.fn().mockResolvedValue([])
        }
    };
}

// keep it here, a vi.mock inside an imported helper registers after the importer resolved the real Client
vi.mock('discord.js', async () => {
    const actual = await vi.importActual<object>('discord.js');
    return {
        ...actual,
        // a regular function, `new` cannot construct an arrow
        Client: vi.fn(function MockClient() {
            return buildMockClient();
        })
    };
});
