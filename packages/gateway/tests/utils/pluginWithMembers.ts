import { Plugin } from '#src/Plugin';

import type { CoreBase } from '@seedcord/core';

export function pluginWithMembers(members: NonNullable<Plugin['dispatchMembers']>): new (host: CoreBase) => Plugin {
    return class extends Plugin {
        public override readonly dispatchMembers = members;

        public init(): Promise<void> {
            return Promise.resolve();
        }
    };
}
