import type { PluginRegistry } from '#src/plugin/PluginRegistry';

// discord signs every interaction it posts with these two headers
export const SIGNATURE_HEADER = 'x-signature-ed25519';
export const TIMESTAMP_HEADER = 'x-signature-timestamp';

type Interactions = (request: Request) => Promise<Response>;

// a signed request skips every plugin because their fetch() would use up part of discord's 3s deadline.
// either header is enough since the engine answers 401 when the other one is missing
export function answerPluginsOrInteractions(
    request: Request,
    plugins: Pick<PluginRegistry, 'answer'>,
    interactions: Interactions
): Promise<Response>;
export function answerPluginsOrInteractions(
    request: Request,
    plugins: Pick<PluginRegistry, 'answer'>,
    interactions: Interactions | undefined
): Promise<Response | undefined>;
export async function answerPluginsOrInteractions(
    request: Request,
    plugins: Pick<PluginRegistry, 'answer'>,
    interactions: Interactions | undefined
): Promise<Response | undefined> {
    const signed = request.headers.has(SIGNATURE_HEADER) || request.headers.has(TIMESTAMP_HEADER);
    if (interactions && signed) return interactions(request);
    return (await plugins.answer(request)) ?? interactions?.(request);
}
