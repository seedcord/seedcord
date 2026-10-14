import { once } from 'node:events';
import { createServer } from 'node:net';

import { SeedcordErrorCode } from '@seedcord/errors';
import { HostListenHost } from '@seedcord/types/internal';
import { describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { bindSignedEnv, serverConfig } from '#tests/helpers/nodeHost';

import type { AddressInfo } from 'node:net';

// the startup lifecycle reports a failed task inside its own error
function codesIn(error: unknown): unknown[] {
    if (!Error.isError(error)) return [];
    const nested: unknown[] = error instanceof AggregateError ? error.errors : [];
    return [Reflect.get(error, 'code'), ...[error.cause, ...nested].flatMap(codesIn)];
}

async function heldPort(host?: string): Promise<{ port: number } & AsyncDisposable> {
    const holder = createServer().listen(0, host);
    await once(holder, 'listening');
    // justified: address() is AddressInfo once a TCP server is listening
    const { port } = holder.address() as AddressInfo;
    return { port, [Symbol.asyncDispose]: () => new Promise((resolve) => holder.close(() => resolve())) };
}

describe('the interactions server port', () => {
    it('throws PortInUse when another process already listens on the port', async () => {
        await using held = await heldPort();
        await bindSignedEnv();
        await using host = new Seedcord({ ...serverConfig(), port: held.port });

        const error: unknown = await host.start().catch((caught: unknown) => caught);

        expect(codesIn(error)).toContain(SeedcordErrorCode.PortInUse);
    });

    it('throws PortInUse when another process holds the listen host seedcord dev set', async () => {
        await using held = await heldPort('127.0.0.1');
        await bindSignedEnv();
        await using host = new Seedcord({ ...serverConfig(), port: held.port });
        host[HostListenHost] = '127.0.0.1';

        const error: unknown = await host.start().catch((caught: unknown) => caught);

        expect(codesIn(error)).toContain(SeedcordErrorCode.PortInUse);
    });
});
