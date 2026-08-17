import { Mongoose } from '#src/Mongoose';

import type { MongooseOptions } from '#src/types/MongooseOptions';
import type { Seedcord as GatewaySeedcord } from '@seedcord/gateway';
import type { HttpEdgeConfig, HttpServerConfig, Seedcord as HttpSeedcord } from '@seedcord/http';

const options: MongooseOptions = { uri: 'mongodb://localhost:27017', name: 'test', dir: '/services' };

function probeGatewayAccepts(bot: GatewaySeedcord): void {
    bot.attach('db', Mongoose, options);
}

function probeHttpServerAccepts(bot: HttpSeedcord<HttpServerConfig>): void {
    bot.attach('db', Mongoose, options);
}

function probeEdgeRejects(bot: HttpSeedcord<HttpEdgeConfig>): void {
    // @ts-expect-error edge plugins arrive post-v1
    bot.attach('db', Mongoose, options);
}

void probeGatewayAccepts;
void probeHttpServerAccepts;
void probeEdgeRejects;
