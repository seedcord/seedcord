import { LoggerChannelRegistry } from '@seedcord/logger';

import { toDevLogLine } from './wire';

import type { ILogSink, LogRecord } from '@seedcord/types';

// a bot in workerd logs to the CLI through its console
// workaround: workerd cancels a hot.send made during a request. @cloudflare/vite-plugin's runner never awaits it.
// move this back to the dev channel once the plugin keeps those sends alive
export class DevLogForwarder implements ILogSink {
    public readonly kind = 'capture';

    public constructor() {
        LoggerChannelRegistry.instance.installSink(this, { muteConsole: true });
    }

    public onLog(record: LogRecord): void {
        // eslint-disable-next-line no-console -- console is the transport
        console.log(toDevLogLine(record));
    }
}
