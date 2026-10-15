import { REST } from '@discordjs/rest';

import type { Mock } from 'vitest';

interface FakeRestClient {
    readonly post: Mock;
    readonly patch: Mock;
}

// tests/setup.ts swaps REST for a fake that lists every client in the order they were built
export function restClients(): FakeRestClient[] {
    const instances: unknown = Reflect.get(REST, 'instances');
    if (!Array.isArray(instances)) throw new TypeError('REST is the real client, tests/setup.ts mocks it');
    // justified: only the setup fake fills this list
    return instances as FakeRestClient[];
}
