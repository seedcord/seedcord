import { describe, it, expect } from 'vitest';

import { Mongoose } from '@src/Mongoose';

import type { Seedcord as GatewaySeedcord } from '@seedcord/gateway';
import type { HttpEdgeConfig, HttpServerConfig, Seedcord as HttpSeedcord } from '@seedcord/http';
import type { MongooseOptions } from '@src/types/MongooseOptions';

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

describe('Mongoose attach scopes', () => {
    it('attaches to a gateway bot and an http server bot, and an edge bot rejects it', () => {
        expect([probeGatewayAccepts, probeHttpServerAccepts, probeEdgeRejects]).toHaveLength(3);
    });
});
