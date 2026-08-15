import { describe, it, expect } from 'vitest';

import { KyselyPostgres } from '#src/KyselyPostgres';

import type { KyselyOptions } from '#src/types/KyselyOptions';
import type { Seedcord as GatewaySeedcord } from '@seedcord/gateway';
import type { HttpEdgeConfig, HttpServerConfig, Seedcord as HttpSeedcord } from '@seedcord/http';

const options: KyselyOptions = {
    connectionString: 'postgres://localhost:5432/test',
    migrations: { path: '/migrations' },
    dir: '/services'
};

function probeGatewayAccepts(bot: GatewaySeedcord): void {
    bot.attach('sql', KyselyPostgres, options);
}

function probeHttpServerAccepts(bot: HttpSeedcord<HttpServerConfig>): void {
    bot.attach('sql', KyselyPostgres, options);
}

function probeEdgeRejects(bot: HttpSeedcord<HttpEdgeConfig>): void {
    // @ts-expect-error edge plugins arrive post-v1
    bot.attach('sql', KyselyPostgres, options);
}

describe('KyselyPostgres attach scopes', () => {
    it('attaches to a gateway bot and an http server bot, and an edge bot rejects it', () => {
        expect([probeGatewayAccepts, probeHttpServerAccepts, probeEdgeRejects]).toHaveLength(3);
    });
});
