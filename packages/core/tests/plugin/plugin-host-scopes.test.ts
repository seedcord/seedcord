import { describe, it, expect, expectTypeOf } from 'vitest';

import { Plugin } from '#src/plugin/Plugin';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

import type { CoreBase } from '#interfaces/CoreBase';
import type { RuntimeBrand, TransportBrand } from '#src/plugin/brands';

class GatewayScoped extends Plugin<{ transport: 'gateway' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class EdgeScoped extends Plugin<{ runtime: 'edge' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class ServerScoped extends Plugin<{ runtime: 'server' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class Unscoped extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class HttpScoped extends Plugin<{ transport: 'http'; runtime: 'server' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class FullyScoped extends Plugin<{ transport: 'gateway'; runtime: 'server' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

interface TransportCore extends CoreBase {
    readonly extra: string;
}

class NarrowedCtor extends Plugin<{ transport: 'gateway' }> {
    constructor(host: TransportCore) {
        super(host);
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class WidenedCtor extends Plugin<{ transport: 'gateway' }> {
    constructor(
        host: CoreBase,
        public readonly options: { readonly dir: string }
    ) {
        super(host);
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

expectTypeOf<FullyScoped[typeof TransportBrand]>().toEqualTypeOf<'gateway' | undefined>();
expectTypeOf<FullyScoped[typeof RuntimeBrand]>().toEqualTypeOf<'server' | undefined>();
expectTypeOf<GatewayScoped[typeof RuntimeBrand]>().toEqualTypeOf<'any' | undefined>();

describe('attaching a plugin that declares options', () => {
    it('accepts each option axis on its own', () => {
        const host = new TestPluginHost();

        const attached = host.attach('gw', GatewayScoped).attach('rt', ServerScoped);

        expect(attached.gw).toBeInstanceOf(GatewayScoped);
        expect(attached.rt).toBeInstanceOf(ServerScoped);
    });

    it('accepts all three axes at once and keeps the concrete instance type', () => {
        const host = new TestPluginHost();

        const attached = host.attach('scoped', FullyScoped);

        expect(attached.scoped).toBeInstanceOf(FullyScoped);
        expectTypeOf(attached.scoped).toEqualTypeOf<FullyScoped>();
    });

    it('rejects a plugin scoped to the other transport', () => {
        const host = new TestPluginHost();

        // @ts-expect-error HttpScoped declares transport 'http', this host is 'gateway'
        host.attach('wrong', HttpScoped);
    });

    it('rejects a plugin scoped to the other runtime', () => {
        const host = new TestPluginHost();

        // @ts-expect-error EdgeScoped declares runtime 'edge', this host is 'server'
        host.attach('wrong', EdgeScoped);
    });

    it('accepts an unscoped or edge plugin on an edge host', () => {
        const host = new TestPluginHost<'http', 'edge'>();

        const attached = host.attach('any', Unscoped).attach('edge', EdgeScoped);

        expect(attached.any).toBeInstanceOf(Unscoped);
        expect(attached.edge).toBeInstanceOf(EdgeScoped);
    });

    it('rejects a server plugin on an edge host', () => {
        const host = new TestPluginHost<'http', 'edge'>();

        // @ts-expect-error ServerScoped declares runtime 'server', this host is 'edge'
        host.attach('server', ServerScoped);
    });

    it('rejects a constructor narrowing its core parameter past CoreBase', () => {
        const host = new TestPluginHost();

        // @ts-expect-error NarrowedCtor requires a narrower Core than CoreBase
        host.attach('narrow', NarrowedCtor);
    });

    it('accepts a constructor taking CoreBase with trailing options', () => {
        const host = new TestPluginHost();

        const attached = host.attach('wide', WidenedCtor, { dir: './services' });

        expect(attached.wide.options.dir).toBe('./services');
    });
});

// every PluginLike member except the symbol slots
class Impostor {
    public init(): Promise<void> {
        return Promise.resolve();
    }
    public ready(): Promise<void> {
        return Promise.resolve();
    }
    public dispose(): Promise<void> {
        return Promise.resolve();
    }
    public onHmr(): Promise<void> {
        return Promise.resolve();
    }
}

function RejectsAClassCarryingNoPluginBrand(): void {
    // @ts-expect-error Impostor lacks the symbol slots
    new TestPluginHost().attach('impostor', Impostor);
}
void RejectsAClassCarryingNoPluginBrand;
