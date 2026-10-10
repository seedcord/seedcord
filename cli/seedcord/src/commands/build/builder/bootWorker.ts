import { stripVTControlCharacters } from 'node:util';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { createLogger, preview } from 'vite';

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { InlineConfig, Logger, Plugin, PreviewServer } from 'vite';

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

function bootFailed(errors: string[], fallback: string, cause?: unknown): SeedcordError {
    const reason = errors.length > 0 ? errors.join('\n') : fallback;
    return new SeedcordError(SeedcordErrorCode.CliEdgeBootFailed, [reason], { cause });
}

function localUrl(server: PreviewServer): string {
    const url = server.resolvedUrls?.local[0];
    if (url === undefined) {
        throw bootFailed([], 'vite preview listed no local URL, so the build had nowhere to send its test request.');
    }
    return url;
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

    let status: number | undefined;
    try {
        const response = await fetch(localUrl(server)).catch((error: unknown) => {
            const message = Error.isError(error) ? error.message : String(error);
            throw bootFailed(
                errors,
                `The worker closed the connection before it answered (${message}). Run ${paint.bold('wrangler dev')} in the project folder to see workerd's output.`,
                error
            );
        });
        status = response.status;
    } finally {
        // close rethrows a failed startup
        await server.close().catch((error: unknown) => {
            if (status === LOADED_STATUS) throw error;
        });
    }
    if (status === LOADED_STATUS) return;

    throw bootFailed(
        errors,
        `The worker answered a GET with ${status}, where a seedcord bot answers 405. Check that ${paint.bold('instance')} default-exports a ${paint.bold('new Seedcord(...)')} from ${paint.bold('@seedcord/http')}.`
    );
}
