import { stripVTControlCharacters } from 'node:util';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';
import { createLogger } from 'vite';

import { openVitePreview } from '#core/modules/openViteServer';

import { probeWorker } from './probeWorker';

import type { ProbeFailure } from './probeWorker';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { InlineConfig, Logger, Plugin, PreviewServer } from 'vite';

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

function failedProbe({ reason, cause }: ProbeFailure, errors: string[]): SeedcordError {
    if (cause === undefined) return bootFailed(errors, reason);
    return bootFailed(errors, `${reason} Run ${paint.bold('seedcord dev')} to see workerd's output.`, cause);
}

export async function bootWorker(config: InlineConfig): Promise<void> {
    const errors: string[] = [];
    const onFailure = new AsyncDisposableStack();
    // on windows, preview() rejects with workerd's startup error
    const server = await openVitePreview(onFailure, {
        ...config,
        configFile: false,
        customLogger: errorCollector(errors),
        plugins: [...(config.plugins ?? []), answerErrorsQuietly()],
        preview: { port: 0 }
    }).catch(async (error: unknown) => {
        // the throw below reports the startup error that close can rethrow
        await onFailure.disposeAsync().catch(() => undefined);
        throw bootFailed(errors, asError(error).message, error);
    });

    let loaded = false;
    let failure: ProbeFailure | undefined;
    try {
        failure = await probeWorker(localUrl(server));
        loaded = failure === undefined;
    } finally {
        // close rethrows a failed startup
        await server.close().catch((error: unknown) => {
            if (loaded) {
                throw bootFailed(
                    [],
                    `The worker loaded, then vite preview failed to close (${asError(error).message}).`,
                    error
                );
            }
        });
    }
    if (failure !== undefined) throw failedProbe(failure, errors);
}
