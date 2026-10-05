import type { HttpEdgeConfig, HttpServerConfig } from '#src/interfaces/Config';

// typecheck-only, vitest never calls typeChecks

function typeChecks(edge: HttpEdgeConfig['bot'], server: HttpServerConfig['bot']): void {
    // @ts-expect-error an edge REST client keeps both sweepers off
    edge.restOptions = { hashSweepInterval: 60_000 };
    // @ts-expect-error an edge REST client keeps both sweepers off
    edge.restOptions = { handlerSweepInterval: 60_000 };
    edge.restOptions = { timeout: 1234 };

    server.restOptions = { hashSweepInterval: 60_000, handlerSweepInterval: 60_000 };
}

void typeChecks;
