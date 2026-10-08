import { KyselyPostgres } from '#src/KyselyPostgres';

import type { KyselyOptions } from '#src/types/KyselyOptions';
import type { PluginHost } from '@seedcord/core/plugin';
import type { Seedcord as GatewaySeedcord } from '@seedcord/gateway';
import type { Seedcord as HttpSeedcord } from '@seedcord/http';

const options: KyselyOptions = {
    connectionString: 'postgres://localhost:5432/test',
    migrations: { path: '/migrations' },
    dir: '/services'
};

function probeGatewayAccepts(bot: GatewaySeedcord): void {
    bot.attach('sql', KyselyPostgres, options);
}

function probeHttpServerAccepts(bot: HttpSeedcord): void {
    bot.attach('sql', KyselyPostgres, options);
}

// the edge Seedcord extends this base
function probeEdgeRejects(bot: PluginHost<'http', 'edge'>): void {
    // @ts-expect-error KyselyPostgres declares runtime 'server'
    bot.attach('sql', KyselyPostgres, options);
}

void probeGatewayAccepts;
void probeHttpServerAccepts;
void probeEdgeRejects;
