import { paint } from '@seedcord/errors';
import { asError } from '@seedcord/utils/internal';

// the edge Seedcord answers a GET with 405 before it starts the bot
const LOADED_STATUS = 405;

// a cold dev start answered in about 2s on the edge test bot. this only has to catch a request nobody answers
const PROBE_TIMEOUT_MS = 60_000;

export interface ProbeFailure {
    reason: string;
    cause?: unknown;
}

function unanswered(error: unknown, timeoutMs: number): string {
    if (Error.isError(error) && error.name === 'TimeoutError') {
        return `The worker did not answer within ${timeoutMs / 1000}s.`;
    }
    return `The worker closed the connection before it answered (${asError(error).message}).`;
}

function notLoaded(response: Response): string {
    const answered = `The worker answered a GET with ${response.status}, where a seedcord bot answers ${LOADED_STATUS}.`;
    if (!response.ok) return answered;
    return `${answered} Check that ${paint.bold('instance')} default-exports a ${paint.bold('new Seedcord(...)')} from ${paint.bold('@seedcord/http')}.`;
}

function connectTimedOut(error: unknown): boolean {
    if (!Error.isError(error) || !Error.isError(error.cause)) return false;
    return 'code' in error.cause && error.cause.code === 'UND_ERR_CONNECT_TIMEOUT';
}

// node's fetch gives up connecting after 10s, even with time left on the signal
async function fetchUntilConnected(url: string, signal: AbortSignal): Promise<Response> {
    try {
        return await fetch(url, { signal });
    } catch (error: unknown) {
        if (!connectTimedOut(error)) throw error;
        return fetchUntilConnected(url, signal);
    }
}

// workerd loads the worker on its first request
export async function probeWorker(url: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<ProbeFailure | undefined> {
    let response: Response;
    try {
        response = await fetchUntilConnected(url, AbortSignal.timeout(timeoutMs));
    } catch (error: unknown) {
        return { reason: unanswered(error, timeoutMs), cause: error };
    }
    if (response.status === LOADED_STATUS) return undefined;
    const body = await response.text().catch(() => '');
    return { reason: body === '' ? notLoaded(response) : `${notLoaded(response)}\n${body}` };
}
