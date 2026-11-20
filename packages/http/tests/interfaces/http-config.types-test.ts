import type { HttpEdgeConfig, HttpServerConfig } from '#src/interfaces/Config';

// typecheck-only, vitest never calls typeChecks

function typeChecks(base: Pick<HttpEdgeConfig, 'bot' | 'subscribers'>): void {
    const server: HttpServerConfig = { ...base, server: { port: 4000 } };

    // @ts-expect-error Cloudflare runs an edge worker's server, and its config takes only url
    const edge: HttpEdgeConfig = { ...base, server: { port: 3000 } };

    void server;
    void edge;
}

void typeChecks;
