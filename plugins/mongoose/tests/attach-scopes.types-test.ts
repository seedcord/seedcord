import { Mongoose } from '#src/Mongoose';

import type { MongooseOptions } from '#src/types/MongooseOptions';
import type { PluginHost } from '@seedcord/core/plugin';
import type { Seedcord as GatewaySeedcord } from '@seedcord/gateway';
import type { Seedcord as HttpSeedcord } from '@seedcord/http';

const options: MongooseOptions = { uri: 'mongodb://localhost:27017', name: 'test', dir: '/services' };

function probeGatewayAccepts(bot: GatewaySeedcord): void {
    bot.attach('db', Mongoose, options);
}

function probeHttpServerAccepts(bot: HttpSeedcord): void {
    bot.attach('db', Mongoose, options);
}

// the edge Seedcord extends this base
function probeEdgeRejects(bot: PluginHost<'http', 'edge'>): void {
    // @ts-expect-error Mongoose declares runtime 'server'
    bot.attach('db', Mongoose, options);
}

void probeGatewayAccepts;
void probeHttpServerAccepts;
void probeEdgeRejects;
