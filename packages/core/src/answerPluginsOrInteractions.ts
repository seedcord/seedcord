import { isPlainObject } from '@seedcord/utils/internal';

import type { PluginRegistry } from '#src/plugin/PluginRegistry';

// discord signs every interaction it posts with these two headers
export const SIGNATURE_HEADER = 'x-signature-ed25519';
export const TIMESTAMP_HEADER = 'x-signature-timestamp';

export type Interactions = (request: Request) => Promise<Response>;

// discord signs its webhook events with the same headers. an interaction has a token and a webhook event doesn't
async function isInteraction(request: Request): Promise<boolean> {
    if (request.method !== 'POST') return false;
    if (!request.headers.has(SIGNATURE_HEADER) || !request.headers.has(TIMESTAMP_HEADER)) return false;
    const body: unknown = await request
        .clone()
        .json()
        .catch(() => undefined);
    return isPlainObject(body) && typeof body.token === 'string';
}

// an interaction skips every plugin because their fetch() would use up part of discord's 3s deadline
export async function answerPluginsOrInteractions(
    request: Request,
    plugins: Pick<PluginRegistry, 'answer'>,
    interactions: Interactions
): Promise<Response> {
    if (await isInteraction(request)) return interactions(request);
    return (await plugins.answer(request)) ?? interactions(request);
}
