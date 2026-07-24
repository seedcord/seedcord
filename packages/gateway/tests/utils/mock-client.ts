import { vi } from 'vitest';

const mockClient = {
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
    application: {
        commands: {
            set: vi.fn().mockResolvedValue([])
        }
    }
};

vi.mock('discord.js', async () => {
    const actual = await vi.importActual('discord.js');
    const djs = await import('discord.js');
    return {
        ...actual,
        Client: vi.fn().mockImplementation(() => mockClient),
        Events: {
            ClientReady: 'ready',
            InteractionCreate: 'interactionCreate',
            MessageCreate: 'messageCreate'
        },
        Collection: djs.Collection
    };
});
