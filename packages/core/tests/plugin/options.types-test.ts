import { expectTypeOf } from 'vitest';

import { Plugin } from '#src/plugin/Plugin';

import type { CoreBase } from '#interfaces/CoreBase';
import type { RuntimeBrand, TransportBrand } from '#src/plugin/brands';

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

expectTypeOf<Defaults[typeof TransportBrand]>().toEqualTypeOf<'any' | undefined>();
expectTypeOf<Defaults[typeof RuntimeBrand]>().toEqualTypeOf<'any' | undefined>();

expectTypeOf<Narrowed[typeof TransportBrand]>().toEqualTypeOf<'gateway' | undefined>();
expectTypeOf<Narrowed[typeof RuntimeBrand]>().toEqualTypeOf<'server' | undefined>();
