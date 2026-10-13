import path from 'node:path';

import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { CommandRegistry } from '#src/commands/CommandRegistry';
import { Bus } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';
import type { CommandBuilder } from '#src/commands/types';

const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'commands');

function registryWith(put: ReturnType<typeof vi.fn>): CommandRegistry {
    // justified: deploy reads only these members off core
    const core = {
        config: { bot: { commands: { path: FIXTURE } } },
        rest: { put, on: vi.fn(), off: vi.fn() },
        applicationId: 'app-1'
    } as unknown as { bus: Bus };
    core.bus = new Bus(core as unknown as CoreBase);
    return new CommandRegistry(core as unknown as CoreBase);
}

describe('CommandRegistry.deploy', () => {
    it('checks the deployed routes against the handlers', async () => {
        const put = vi.fn().mockResolvedValue([{ id: '1', name: 'bare', type: ApplicationCommandType.ChatInput }]);
        const routes = { warnUnhandledRoutes: vi.fn(), warnUnhandledContextMenuRoutes: vi.fn() };

        await registryWith(put).deploy(new AbortController().signal, { routes });

        expect([...(routes.warnUnhandledRoutes.mock.calls[0]?.[0] as Iterable<string>)]).toEqual(['bare']);
        expect(routes.warnUnhandledContextMenuRoutes).toHaveBeenCalledWith({ user: new Set(), message: new Set() });
    });

    it('sends nothing to discord when the check throws', async () => {
        const put = vi.fn().mockResolvedValue([]);
        const check = vi.fn((_commands: CommandBuilder[]) => {
            throw new Error('needs the Guilds intent');
        });

        await expect(registryWith(put).deploy(new AbortController().signal, { check })).rejects.toThrow('Guilds');

        expect(check.mock.calls[0]?.[0].map((command) => command.name)).toEqual(['bare']);
        expect(put).not.toHaveBeenCalled();
    });
});
