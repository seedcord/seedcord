import { describe, expectTypeOf, it } from 'vitest';

import { Plugin } from '@src/plugin/Plugin';

import type { CoreBase } from '@interfaces/CoreBase';
import type { Logger } from '@seedcord/logger';

class Defaults extends Plugin {
    // justified: never invoked, these fixtures exist for type probes only
    public logger = null as unknown as Logger;
    public init(): Promise<void> {
        return Promise.resolve();
    }
    constructor(host: CoreBase) {
        super(host);
    }
}

class Narrowed extends Plugin<{ transport: 'gateway'; runtime: 'server' }> {
    // justified: never invoked, these fixtures exist for type probes only
    public logger = null as unknown as Logger;
    public init(): Promise<void> {
        return Promise.resolve();
    }
    constructor(host: CoreBase) {
        super(host);
    }
}

describe('plugin brands', () => {
    it('defaults both axis brands to both', () => {
        expectTypeOf<Defaults['__transport']>().toEqualTypeOf<'both' | undefined>();
        expectTypeOf<Defaults['__runtime']>().toEqualTypeOf<'both' | undefined>();
    });

    it('carries the declared axis literals', () => {
        expectTypeOf<Narrowed['__transport']>().toEqualTypeOf<'gateway' | undefined>();
        expectTypeOf<Narrowed['__runtime']>().toEqualTypeOf<'server' | undefined>();
    });
});
