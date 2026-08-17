import { expectTypeOf } from 'vitest';

import { Plugin } from '#src/plugin/Plugin';

import type { CoreBase } from '#interfaces/CoreBase';

class Defaults extends Plugin {
    // justified: never invoked, these fixtures exist for type probes only
    public init(): Promise<void> {
        return Promise.resolve();
    }
    constructor(host: CoreBase) {
        super(host);
    }
}

class Narrowed extends Plugin<{ transport: 'gateway'; runtime: 'server' }> {
    // justified: never invoked, these fixtures exist for type probes only
    public init(): Promise<void> {
        return Promise.resolve();
    }
    constructor(host: CoreBase) {
        super(host);
    }
}

expectTypeOf<Defaults['__transport']>().toEqualTypeOf<'any' | undefined>();
expectTypeOf<Defaults['__runtime']>().toEqualTypeOf<'any' | undefined>();

expectTypeOf<Narrowed['__transport']>().toEqualTypeOf<'gateway' | undefined>();
expectTypeOf<Narrowed['__runtime']>().toEqualTypeOf<'server' | undefined>();
