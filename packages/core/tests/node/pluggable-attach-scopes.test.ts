import { REST } from '@discordjs/rest';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { describe, it, expect, expectTypeOf, afterEach } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '#node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '#node/Pluggable';
import { Plugin } from '#src/plugin/Plugin';
import { Bus } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';
import type { RuntimeBrand, TransportBrand } from '#src/plugin/brands';
import type { Runtime } from '#src/plugin/options';
import type { Config, IRateLimiter } from '@seedcord/types';

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

class TestHost extends Pluggable<'gateway', 'server'> {
    public readonly config = {} as Config;
    public readonly rest = new REST();
    public readonly applicationId = 'app-1';
    public readonly rateLimiter: IRateLimiter = new MemoryRateLimiter();
    public readonly bus: Bus;

    constructor() {
        super(new CoordinatedShutdown(), new CoordinatedStartup());
        this.bus = new Bus(this);
    }

    public static resetHost(): void {
        Pluggable.reset();
    }
}

expectTypeOf<FullyScoped[typeof TransportBrand]>().toEqualTypeOf<'gateway' | undefined>();
expectTypeOf<FullyScoped[typeof RuntimeBrand]>().toEqualTypeOf<'server' | undefined>();
expectTypeOf<GatewayScoped[typeof RuntimeBrand]>().toEqualTypeOf<'any' | undefined>();

describe('attaching a plugin that declares options', () => {
    afterEach(() => {
        TestHost.resetHost();
    });

    it('accepts each option axis on its own', () => {
        const host = new TestHost();

        const attached = host.attach('gw', GatewayScoped).attach('rt', ServerScoped);

        expect(attached.gw).toBeInstanceOf(GatewayScoped);
        expect(attached.rt).toBeInstanceOf(ServerScoped);
    });

    it('accepts all three axes at once and keeps the concrete instance type', () => {
        const host = new TestHost();

        const attached = host.attach('scoped', FullyScoped);

        expect(attached.scoped).toBeInstanceOf(FullyScoped);
        expectTypeOf(attached.scoped).toEqualTypeOf<FullyScoped>();
    });

    it('rejects a plugin scoped to the other transport', () => {
        const host = new TestHost();

        // @ts-expect-error HttpScoped declares transport 'http', this host is 'gateway'
        host.attach('wrong', HttpScoped);
    });

    it('rejects a plugin scoped to the other runtime', () => {
        const host = new TestHost();

        // @ts-expect-error EdgeScoped declares runtime 'edge', this host is 'server'
        host.attach('wrong', EdgeScoped);
    });

    it('rejects every plugin on an edge host', () => {
        class EdgeHost extends Pluggable<'http', 'edge'> {
            public readonly config = {} as Config;
            public readonly rest = new REST();
            public readonly applicationId = 'app-1';
            public readonly rateLimiter: IRateLimiter = new MemoryRateLimiter();
            public readonly bus: Bus;
            constructor() {
                super(new CoordinatedShutdown(), new CoordinatedStartup());
                this.bus = new Bus(this);
            }
            public static resetHost(): void {
                Pluggable.reset();
            }
        }
        EdgeHost.resetHost();
        const host = new EdgeHost();

        // @ts-expect-error edge plugins arrive post-v1, an unscoped plugin is rejected too
        host.attach('any', Unscoped);
    });

    it('rejects every plugin when the host runtime is not narrowed to one value', () => {
        // an http host lands here when its config type is the whole union, leaving 'edge' in BotRt
        class WideHost extends Pluggable<'http', Runtime> {
            public readonly config = {} as Config;
            public readonly rest = new REST();
            public readonly applicationId = 'app-1';
            public readonly rateLimiter: IRateLimiter = new MemoryRateLimiter();
            public readonly bus: Bus;
            constructor() {
                super(new CoordinatedShutdown(), new CoordinatedStartup());
                this.bus = new Bus(this);
            }
            public static resetHost(): void {
                Pluggable.reset();
            }
        }
        WideHost.resetHost();
        const host = new WideHost();

        // @ts-expect-error a host that might be edge takes no plugins
        host.attach('any', Unscoped);
    });

    it('rejects a constructor narrowing its core parameter past CoreBase', () => {
        const host = new TestHost();

        // @ts-expect-error NarrowedCtor requires a narrower Core than CoreBase
        host.attach('narrow', NarrowedCtor);
    });

    it('accepts a constructor taking CoreBase with trailing options', () => {
        const host = new TestHost();

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
    new TestHost().attach('impostor', Impostor);
}
void RejectsAClassCarryingNoPluginBrand;
