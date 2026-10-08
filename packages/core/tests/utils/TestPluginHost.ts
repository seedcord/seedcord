import { REST } from '@discordjs/rest';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';

import { PluginHost } from '#src/plugin/PluginHost';
import { Bus } from '#subscribers/Bus';

import type { Runtime, Transport } from '#src/plugin/options';
import type { Config, IRateLimiter } from '@seedcord/types';

export class TestPluginHost<BotT extends Transport = 'gateway', BotRt extends Runtime = 'server'> extends PluginHost<
    BotT,
    BotRt
> {
    // justified: attach reads nothing off config
    public readonly config = {} as Config;
    public readonly rest = new REST();
    public readonly applicationId = 'app-1';
    public readonly rateLimiter: IRateLimiter = new MemoryRateLimiter();
    public readonly bus: Bus = new Bus(this);
}
