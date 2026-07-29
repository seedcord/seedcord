import { Logger } from '@seedcord/logger';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { describe, it, expect, expectTypeOf, afterEach } from 'vitest';

import { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '@node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '@node/Pluggable';
import { Plugin } from '@src/plugin/Plugin';
import { Bus } from '@subscribers/Bus';

import type { Config, IRateLimiter } from '@seedcord/types';
import type { Runtime } from '@src/plugin/options';

class GatewayScoped extends Plugin<{ transport: 'gateway' }> {
    public logger = new Logger('GatewayScoped');
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class EdgeScoped extends Plugin<{ runtime: 'edge' }> {
    public logger = new Logger('EdgeScoped');
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class NeedsScoped extends Plugin<{ needs: 'rest' }> {
    public logger = new Logger('NeedsScoped');
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class HttpScoped extends Plugin<{ transport: 'http'; runtime: 'server'; needs: 'rest' }> {
    public logger = new Logger('HttpScoped');
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class FullyScoped extends Plugin<{ transport: 'gateway'; runtime: 'server'; needs: 'rest' }> {
    public logger = new Logger('FullyScoped');
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class TestHost extends Pluggable<'gateway', 'server'> {
    public readonly config = {} as Config;
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

describe('attaching a plugin that declares options', () => {
    afterEach(() => {
        TestHost.resetHost();
    });

    it('accepts each option axis on its own', () => {
        const host = new TestHost();

        const attached = host.attach('gw', GatewayScoped).attach('needs', NeedsScoped);

        expect(attached.gw).toBeInstanceOf(GatewayScoped);
        expect(attached.needs).toBeInstanceOf(NeedsScoped);
    });

    it('accepts all three axes at once and keeps the concrete instance type', () => {
        const host = new TestHost();

        const attached = host.attach('scoped', FullyScoped);

        expect(attached.scoped).toBeInstanceOf(FullyScoped);
        expectTypeOf(attached.scoped).toEqualTypeOf<FullyScoped>();
    });

    it('keeps the declared brands readable off the attached instance type', () => {
        expectTypeOf<FullyScoped['__transport']>().toEqualTypeOf<'gateway' | undefined>();
        expectTypeOf<FullyScoped['__runtime']>().toEqualTypeOf<'server' | undefined>();
        expectTypeOf<GatewayScoped['__runtime']>().toEqualTypeOf<'any' | undefined>();
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
        host.attach('any', NeedsScoped);
    });

    it('rejects every plugin when the host runtime is not narrowed to one value', () => {
        // an http host lands here when its config type is the whole union, leaving 'edge' in BotRt
        class WideHost extends Pluggable<'http', Runtime> {
            public readonly config = {} as Config;
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
        host.attach('any', NeedsScoped);
    });

    it('rejects a class that carries no plugin brand', () => {
        const host = new TestHost();

        // every PluginLike member except the two symbol slots
        class Impostor {
            public logger = new Logger('Impostor');
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

        // @ts-expect-error Impostor lacks the two symbol slots
        host.attach('impostor', Impostor);
    });
});
