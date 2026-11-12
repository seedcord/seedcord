import { Tasks } from '#src/Tasks';

import type { TasksOptions } from '#src/types/Tasks';
import type { PluginHost } from '@seedcord/core/plugin';
import type { Seedcord as GatewaySeedcord } from '@seedcord/gateway';
import type { Seedcord as HttpSeedcord } from '@seedcord/http';

const options: TasksOptions = { path: '/tasks' };

function probeGatewayAccepts(bot: GatewaySeedcord): void {
    bot.attach('tasks', Tasks, options);
}

function probeHttpServerAccepts(bot: HttpSeedcord): void {
    bot.attach('tasks', Tasks, options);
}

// the edge Seedcord extends this base
function probeEdgeRejects(bot: PluginHost<'http', 'edge'>): void {
    // @ts-expect-error Tasks declares runtime 'server'
    bot.attach('tasks', Tasks, options);
}

void probeGatewayAccepts;
void probeHttpServerAccepts;
void probeEdgeRejects;
