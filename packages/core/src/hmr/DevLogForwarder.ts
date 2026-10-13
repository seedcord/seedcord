import { LoggerChannelRegistry } from '@seedcord/logger';

import { toWireLog } from './wire';

import type { ILogSink, LogRecord } from '@seedcord/types';
import type { DevChannel, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';

// a bot in workerd logs to the CLI through this
export class DevLogForwarder implements ILogSink {
    public readonly kind = 'capture';
    // vite loses a send made before the CLI's first event arrives
    private held: LogRecord[] | undefined = [];

    public constructor(private readonly channel: DevChannel<SeedcordFrameworkEvents, SeedcordCliEvents>) {
        LoggerChannelRegistry.instance.installSink(this, { muteConsole: true });
    }

    public onLog(record: LogRecord): void {
        if (this.held) this.held.push(record);
        else this.send(record);
    }

    public open(): void {
        const held = this.held ?? [];
        this.held = undefined;
        for (const record of held) this.send(record);
    }

    private send(record: LogRecord): void {
        this.channel.send('seedcord:log', toWireLog(record));
    }
}
