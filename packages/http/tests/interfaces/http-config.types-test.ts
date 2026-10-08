import type { HttpEdgeConfig, HttpServerConfig } from '#src/interfaces/Config';
import type { Config } from '@seedcord/types';

// typecheck-only, vitest never calls typeChecks

function typeChecks(base: Pick<Config, 'bot' | 'subscribers'>): void {
    const server: HttpServerConfig = { ...base, port: 4000 };

    // @ts-expect-error port is a node-server option, an edge worker binds nothing
    const edge: HttpEdgeConfig = { ...base, port: 3000 };

    void server;
    void edge;
}

void typeChecks;
