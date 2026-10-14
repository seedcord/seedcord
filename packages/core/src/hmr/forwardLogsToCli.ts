import { LoggerChannelRegistry } from '@seedcord/logger';

import { toDevLogLine } from './wire';

// a bot in workerd logs to the CLI through its console
// workaround: workerd cancels a hot.send made during a request. @cloudflare/vite-plugin's runner never awaits it.
// move this back to the dev channel once the plugin gets fixed
export function forwardLogsToCli(): void {
    LoggerChannelRegistry.instance.installSink(
        {
            kind: 'capture',
            // eslint-disable-next-line no-console -- console is the transport
            onLog: (record) => console.log(toDevLogLine(record))
        },
        { muteConsole: true }
    );
}
