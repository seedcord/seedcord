// compile-only. tc fails on any unused @ts-expect-error below.
import { Plugin } from '#src/plugin/Plugin';

import type { CoreBase } from '#interfaces/CoreBase';
import type { PluginHost } from '#src/plugin/PluginHost';

class NoConstructor extends Plugin<{ runtime: 'server' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class Drifted extends Plugin<{ runtime: 'server' }> {
    constructor(host: CoreBase) {
        // @ts-expect-error the type argument declares runtime 'server'
        super(host, { runtime: 'edge' });
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class Missing extends Plugin<{ runtime: 'server' }> {
    constructor(host: CoreBase) {
        // @ts-expect-error a plugin narrowed to 'server' passes its runtime
        super(host);
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

declare const host: PluginHost<'gateway', 'server'>;

function rejectsAPluginWithNoConstructorOfItsOwn(): void {
    // @ts-expect-error NoConstructor never passes its runtime to super()
    host.attach('bare', NoConstructor);
}

void Drifted;
void Missing;
void rejectsAPluginWithNoConstructorOfItsOwn;
