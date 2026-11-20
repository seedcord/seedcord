import { MemoryDriver } from '@seedcord/core';
import { PluginHost } from '@seedcord/core/plugin';

import type { CoreBase } from '@seedcord/core';

export class TestHost extends PluginHost<'gateway', 'server'> {
    // justified: nothing under test reads these
    public readonly config = {} as CoreBase['config'];
    public readonly rest = {} as CoreBase['rest'];
    public readonly applicationId = 'app';
    public readonly url = new URL('https://bot.test/');

    constructor() {
        super('gateway', 'server', new MemoryDriver());
    }
}
