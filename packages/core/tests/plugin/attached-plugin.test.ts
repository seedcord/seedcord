import { describe, expectTypeOf, it } from 'vite-plus/test';

import { Plugin } from '#src/plugin/Plugin';

import type { AttachedPlugin } from '#src/plugin/Plugin';

class Greeter extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }

    public greet(): string {
        return 'hi';
    }
}

type HiddenMember = 'init' | 'ready' | 'dispose' | 'codegen' | 'onHmr' | 'dispatchMembers' | 'prepareCommands';

describe('AttachedPlugin', () => {
    it('keeps the methods a plugin offers and removes its lifecycle members', () => {
        expectTypeOf<AttachedPlugin<Greeter>['greet']>().returns.toBeString();
        expectTypeOf<Extract<keyof AttachedPlugin<Greeter>, HiddenMember>>().toBeNever();
    });

    it('does the same for every plugin in a group', () => {
        type Group = AttachedPlugin<Record<'greeter', Greeter>>;

        expectTypeOf<Group['greeter']['greet']>().returns.toBeString();
        expectTypeOf<Extract<keyof Group['greeter'], HiddenMember>>().toBeNever();
    });
});
