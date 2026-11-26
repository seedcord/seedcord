import { Events } from 'discord.js';
import { vi } from 'vite-plus/test';

import type { Seedcord } from '#src/Seedcord';
import type { Mock } from 'vite-plus/test';

// the mock client never connects, and login waits on ClientReady
export function readyOnLogin(seedcord: Seedcord): void {
    vi.spyOn(seedcord.bot, 'botToken', 'get').mockReturnValue('token');
    // eslint-disable-next-line no-restricted-syntax -- fixture cast, setup.ts replaces the discord.js Client with plain vi.fn stubs
    const client = seedcord.bot.client as unknown as { once: Mock };
    client.once.mockImplementation((event: Events, onReady: () => void) => {
        if (event === Events.ClientReady) onReady();
    });
}
