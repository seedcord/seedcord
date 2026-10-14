import { WinstonConsoleSink } from '#src/node';

const LOG_EVERY_MS = 10;
const EXIT_AFTER_MS = 1000;

let caught = 0;
// a bot with this handler keeps running after a failed write
process.on('uncaughtException', () => {
    caught++;
});

const sink = new WinstonConsoleSink();
const log = (message: string): void => {
    sink.onLog({ level: 'info', message, label: 'Child', channel: 'default', timestamp: Date.now() });
};

log('ready');
setInterval(() => log('still logging'), LOG_EVERY_MS);
setTimeout(() => process.exit(caught), EXIT_AFTER_MS);
