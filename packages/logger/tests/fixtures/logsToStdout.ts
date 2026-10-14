import { WinstonConsoleSink } from '#src/node';

const LOG_EVERY_MS = 10;
const EXIT_AFTER_MS = 1000;

const sink = new WinstonConsoleSink();
const log = (message: string): void => {
    sink.onLog({ level: 'info', message, label: 'Child', channel: 'default', timestamp: Date.now() });
};

log('ready');
setInterval(() => log('still logging'), LOG_EVERY_MS);
setTimeout(() => process.exit(0), EXIT_AFTER_MS);
