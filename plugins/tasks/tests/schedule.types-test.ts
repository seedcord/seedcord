import { expectTypeOf } from 'vite-plus/test';

import { RegisterTask } from '#src/decorators/RegisterTask';
import { Task as GatewayTask } from '#src/gateway.index';
import { Task as HttpTask } from '#src/http.index';
import { Task } from '#src/Task';

import type { Tasks } from '#src/Tasks';
import type { TaskData } from '#src/types/Tasks';
import type { Subscriptions } from '@seedcord/core';
import type { Core as GatewayCore } from '@seedcord/gateway';
import type { Core as HttpCore } from '@seedcord/http';

declare const tasks: Tasks;

abstract class Stub<TData> extends Task<TData> {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class NoData extends Stub<void> {}
class Unban extends Stub<{ guildId: string; bannedAt: Date }> {}
class Holds extends Stub<{ ids: Set<string> }> {}
class Callback extends Stub<{ run: () => void }> {}
class Optional extends Stub<string | undefined> {}

function probeSchedule(): void {
    void tasks.schedule(NoData, { in: '30s' });
    void tasks.schedule(NoData, { at: new Date() });
    void tasks.schedule(Unban, { at: Date.now(), data: { guildId: '1', bannedAt: new Date() } });
    void tasks.schedule(Optional, { in: '30s', data: 'x' });
    void tasks.schedule(Optional, { in: '30s', data: undefined });

    // @ts-expect-error a task without data takes no data
    void tasks.schedule(NoData, { in: '30s', data: { guildId: '1' } });
    // @ts-expect-error a task with data needs it
    void tasks.schedule(Unban, { in: '30s' });
    // @ts-expect-error a field of the wrong type
    void tasks.schedule(Unban, { in: '30s', data: { guildId: 1, bannedAt: new Date() } });
    // @ts-expect-error in and at exclude each other
    void tasks.schedule(NoData, { in: '30s', at: new Date() });
    // @ts-expect-error not a duration
    void tasks.schedule(NoData, { in: 'soon' });
    // @ts-expect-error a zero duration
    void tasks.schedule(NoData, { in: '0s' });
    // @ts-expect-error a Set has no JSON form
    void tasks.schedule(Holds, { in: '30s', data: { ids: new Set<string>() } });
    // @ts-expect-error a function has no JSON form
    void tasks.schedule(Callback, { in: '30s', data: { run: () => undefined } });
}

function probeControls(): void {
    tasks.pause(NoData);
    // @ts-expect-error pause only takes a task without data
    tasks.pause(Unban);
    // @ts-expect-error trigger only takes a task without data
    void tasks.trigger(Unban);
}

function probeDecorator(): void {
    RegisterTask('* * * * *')(NoData);
    RegisterTask()(Unban);
    RegisterTask({ key: 'unban' })(Unban);

    // @ts-expect-error a scheduled task takes only a key, since the cron options do nothing there
    RegisterTask({ key: 'unban', protect: false });
    // @ts-expect-error a cron task can't declare data
    RegisterTask('* * * * *')(Unban);
    // @ts-expect-error a misspelled timezone
    RegisterTask('* * * * *', { timezone: 'America/New_Yrok' });
    RegisterTask('* * * * *', { timezone: 'America/New_York' });
    RegisterTask('* * * * * *', { every: '90s' });
    // @ts-expect-error a zero gap
    RegisterTask('* * * * * *', { every: '0s' });
    // @ts-expect-error not a whole number
    RegisterTask('* * * * * *', { every: '1.5h' });
}

void probeSchedule;
void probeControls;
void probeDecorator;

expectTypeOf<TaskData<{ at: Date; name: string }>>().toEqualTypeOf<{ at: string; name: string }>();
expectTypeOf<TaskData<void>>().toBeVoid();
expectTypeOf<TaskData<string | undefined>>().toEqualTypeOf<string | undefined>();

class OnGateway extends GatewayTask {
    public async execute(): Promise<void> {
        expectTypeOf(this.core).toEqualTypeOf<GatewayCore>();
        await Promise.resolve();
    }
}

class OnHttp extends HttpTask {
    public async execute(): Promise<void> {
        expectTypeOf(this.core).toEqualTypeOf<HttpCore>();
        await Promise.resolve();
    }
}

void OnGateway;
void OnHttp;

declare const host: { bus: { on: (event: 'taskRan', listener: (run: Subscriptions['taskRan']) => void) => void } };

host.bus.on('taskRan', (run) => {
    if (run.trigger === 'scheduled') expectTypeOf(run.jobId).toEqualTypeOf<string>();
    else expectTypeOf(run.jobId).toEqualTypeOf<null>();

    if (run.outcome === 'failed') expectTypeOf(run.error).toEqualTypeOf<Error>();
    // @ts-expect-error only a failed run has an error
    else void run.error;
});
