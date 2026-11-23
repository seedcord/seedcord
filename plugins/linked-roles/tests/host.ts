import { REST } from '@discordjs/rest';
import { PluginHost } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { CoreBase } from '@seedcord/core';

export const APP_ID = '1564002376115949650';

// a kv driver that isn't the in-memory default, which the plugin refuses to keep tokens in
export class MapDriver {
    private readonly records = new Map<string, string>();

    public get(key: string): string | undefined {
        return this.records.get(key);
    }

    public set(key: string, value: string): void {
        this.records.set(key, value);
    }

    public delete(key: string): void {
        this.records.delete(key);
    }

    public *entries(prefix: string): Iterable<[string, string]> {
        for (const entry of this.records) if (entry[0].startsWith(prefix)) yield entry;
    }

    public [Symbol.dispose](): void {
        this.records.clear();
    }
}

export const SERVER_URL_UNSET = Symbol('server.url unset');

interface TestHostOptions {
    api: string;
    url?: string | typeof SERVER_URL_UNSET;
    kv?: CoreBase['config']['kv'];
}

export class TestHost extends PluginHost<'http', 'server'> {
    // justified: nothing under test reads the config
    public readonly config = {} as CoreBase['config'];
    public readonly rest: REST;
    public readonly applicationId = APP_ID;
    private readonly configuredUrl: string | typeof SERVER_URL_UNSET;

    constructor({ api, url = 'https://bot.test/', kv = new MapDriver() }: TestHostOptions) {
        super('http', 'server', kv);
        this.rest = new REST({ api }).setToken('bot-token');
        this.configuredUrl = url;
    }

    public get url(): URL {
        if (this.configuredUrl === SERVER_URL_UNSET) throw new SeedcordError(SeedcordErrorCode.CoreServerUrlUnset);
        return new URL(this.configuredUrl);
    }
}
