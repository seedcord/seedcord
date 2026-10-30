import { REST } from '@discordjs/rest';
import { Bus } from '@seedcord/core';
import { PluginHost } from '@seedcord/core/plugin';
import { validateDiscordToken } from '@seedcord/errors/internal';

import { edgeRestOptions, edgeShutdown } from '#src/edge/defaults';

import type { HttpConfig } from '#interfaces/Config';
import type { Core } from '#interfaces/Core';

class TestCore extends PluginHost<'http', 'edge'> implements Core {
    public readonly rest: REST;
    public readonly bus: Bus = new Bus(this);
    public readonly startup: Core['startup'] = { addTask: () => undefined };
    public readonly shutdown = edgeShutdown;

    constructor(
        public readonly config: HttpConfig,
        private readonly token: string
    ) {
        super('http', 'edge', config.kv);
        this.rest = new REST(edgeRestOptions(config.bot.restOptions)).setToken(token);
    }

    public get applicationId(): string {
        return validateDiscordToken(this.token).applicationId;
    }
}

export function testCore(config: HttpConfig, token: string): Core {
    return new TestCore(config, token);
}
