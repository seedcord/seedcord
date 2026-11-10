import { Plugin } from '#src/Plugin';

import type { CoreBase, DispatchOrigin } from '@seedcord/core';

export function pluginWithMembers(
    members: Readonly<Record<string, (origin: DispatchOrigin) => unknown>>
): new (host: CoreBase) => Plugin {
    return class extends Plugin {
        public override readonly dispatchMembers = members;

        public init(): Promise<void> {
            return Promise.resolve();
        }
    };
}
