import { stripVTControlCharacters } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { createLogger, preview } from 'vite';

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { InlineConfig, Logger, Plugin } from 'vite';

// the edge Seedcord answers a GET with 405 before it starts the bot
const LOADED_STATUS = 405;
const INTERNAL_SERVER_ERROR = 500;

// the cloudflare plugin passes workerd's startup error to this logger
function errorCollector(errors: string[]): Logger {
    const logger = createLogger('silent');
    logger.error = (message) => {
        errors.push(stripVTControlCharacters(message));
    };
    return logger;
}

// connect prints the error's stack to stderr when nothing else answers it
function answerErrorsQuietly(): Plugin {
    return {
        name: 'seedcord:answer-errors-quietly',
        configurePreviewServer(server) {
            return () => {
                server.middlewares.use(
                    (_error: unknown, _request: IncomingMessage, response: ServerResponse, _next: () => void) => {
                        response.statusCode = INTERNAL_SERVER_ERROR;
                        response.end();
                    }
                );
            };
        }
    };
}

// workerd loads the worker on its first request
export async function bootWorker(config: InlineConfig): Promise<void> {
    const errors: string[] = [];
    const server = await preview({
        ...config,
        configFile: false,
        customLogger: errorCollector(errors),
        plugins: [...(config.plugins ?? []), answerErrorsQuietly()],
        preview: { port: 0 }
    });

    let loaded = false;
    try {
        const url = server.resolvedUrls?.local[0];
        if (url === undefined) {
            throw new SeedcordError(SeedcordErrorCode.CliEdgeBootFailed, ['vite preview reported no URL']);
        }
        const response = await fetch(url);
        loaded = response.status === LOADED_STATUS;
    } finally {
        // close rethrows a failed startup
        await server.close().catch((error: unknown) => {
            if (loaded) throw error;
        });
    }

    if (!loaded) throw new SeedcordError(SeedcordErrorCode.CliEdgeBootFailed, [errors.join('\n')]);
}
