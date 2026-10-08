import { storeInteractionRoute } from '@seedcord/core/internal';
import { Envapter, PortableSource } from 'envapt';

import { Seedcord } from '#src/edge/Seedcord';
import { BUILT_ROOT, registerBuiltFiles } from '#tests/helpers/builtFiles';
import { createSigner, type Signer } from '#tests/helpers/ed25519';
import { VALID_TOKEN } from '#tests/helpers/fixtures';

import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { HttpEdgeConfig } from '#interfaces/Config';
import type { EngineContext } from '#src/engine';
import type { InteractionKind } from '@seedcord/core';
import type { StoredSubscriberCtor } from '@seedcord/core/internal';
import type { TypedOmit } from '@seedcord/types';

const encoder = new TextEncoder();

export const FROM = 'handlers/Test.ts';

// the classes a test bot loads, one file per class
export interface BotClasses {
    readonly handlers: readonly HandlerConstructor[];
    readonly middleware: readonly InteractionMiddlewareConstructor[];
    readonly subscribers: readonly StoredSubscriberCtor[];
}

export function noClasses(): BotClasses {
    return { handlers: [], middleware: [], subscribers: [] };
}

// stamps the metadata a route decorator writes on a real handler
export function routedHandler(kind: InteractionKind, key: string, handler: HandlerConstructor): BotClasses {
    storeInteractionRoute(kind, key, handler);
    return { ...noClasses(), handlers: [handler] };
}

export async function signedRequest(signer: Signer, payload: unknown): Promise<Request> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = encoder.encode(JSON.stringify(payload));
    return new Request('https://bot.example/interactions', {
        method: 'POST',
        headers: {
            'x-signature-ed25519': await signer.sign(timestamp, body),
            'x-signature-timestamp': timestamp
        },
        body
    });
}

const FOLDERS = { handlers: 'handlers', middleware: 'middlewares', subscribers: 'subscribers' } as const;

function filesOf(classes: BotClasses): Record<string, Record<string, unknown>> {
    const files: Record<string, Record<string, unknown>> = {};
    for (const kind of Object.keys(FOLDERS) as (keyof BotClasses)[]) {
        classes[kind].forEach((ctor, index) => {
            files[`/${FOLDERS[kind]}/${String(index)}-${ctor.name}.ts`] = { [ctor.name]: ctor };
        });
    }
    return files;
}

interface EngineOptions {
    readonly settings?: TypedOmit<HttpEdgeConfig, 'bot' | 'subscribers'>;
    readonly env?: Readonly<Record<string, string>>;
}

type Handle = (request: Request, ctx?: EngineContext) => Promise<Response>;

// a fresh edge Seedcord per call, loading the classes from a fresh file table
export async function readyEngine(
    classes: BotClasses,
    options: EngineOptions = {}
): Promise<{ signer: Signer; handle: Handle }> {
    const signer = await createSigner();
    Envapter.useSource(
        new PortableSource({ ...options.env, DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
    );
    registerBuiltFiles(filesOf(classes), Object.values(FOLDERS));

    // @ts-expect-error singleton reset between engines
    Seedcord.reset();
    const seedcord = new Seedcord({
        ...options.settings,
        bot: {
            interactions: {
                path: `${BUILT_ROOT}/${FOLDERS.handlers}`,
                middlewares: `${BUILT_ROOT}/${FOLDERS.middleware}`
            },
            commands: { path: null }
        },
        subscribers: { path: `${BUILT_ROOT}/${FOLDERS.subscribers}` }
    });
    return { signer, handle: (request, ctx) => seedcord.fetch(request, undefined, ctx) };
}

export { capturingCtx, slashPayload } from '#tests/helpers/interactions';
