import crypto from 'node:crypto';

import { Logger } from '@seedcord/logger';

import { asError } from '#stops/asError';
import { PublishDefault } from '#subscribers/publishDefault';

import type { CoreBase } from '#interfaces/CoreBase';
import type { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';

const logger = new Logger('Faults', { channel: 'errors' });

/** @internal */
export function registerProcessErrors(core: CoreBase, shutdown: CoordinatedShutdown): () => void {
    function report(caught: unknown, routeId: string): void {
        const error = asError(caught);
        const uuid = crypto.randomUUID();

        if (core.config.errors?.errorStack ?? false) logger.error(uuid, error);
        else logger.error(`${uuid} | ${error.message}`);

        core.bus[PublishDefault]('unknownException', { uuid, error, routeId });
    }

    const onRejection = (reason: unknown): void => {
        report(reason, 'process:unhandledRejection');
    };

    const onException = (caught: unknown): void => {
        report(caught, 'process:uncaughtException');
        // node does not exit on its own once a listener is registered
        void shutdown.run(1);
    };

    process.on('unhandledRejection', onRejection);
    process.on('uncaughtException', onException);

    return () => {
        process.off('unhandledRejection', onRejection);
        process.off('uncaughtException', onException);
    };
}
