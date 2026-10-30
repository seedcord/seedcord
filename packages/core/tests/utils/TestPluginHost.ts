import { REST } from '@discordjs/rest';

import { Kv } from '#src/kv/Kv';
import { MemoryDriver } from '#src/kv/MemoryDriver';
import { PluginHost } from '#src/plugin/PluginHost';
import { Bus } from '#subscribers/Bus';
import { memoryRateLimiter } from '#tests/utils/memoryRateLimiter';

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
    public readonly rateLimiter: IRateLimiter = memoryRateLimiter();
    public readonly kv = new Kv(new MemoryDriver());
    public readonly bus: Bus = new Bus(this);

    constructor(transport?: BotT, runtime?: BotRt) {
        // justified: the fallbacks are the class's default type arguments
        super(transport ?? ('gateway' as BotT), runtime ?? ('server' as BotRt));
    }
}
