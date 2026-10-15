import { storeInteractionRoute } from '@seedcord/core/internal';
import { Envapter, PortableSource } from 'envapt';

import { Seedcord } from '#src/edge/Seedcord';
import { registerBakedIds } from '#tests/helpers/bakedIds';
import { BUILT_ROOT, registerBuiltFiles } from '#tests/helpers/builtFiles';
import { createSigner, signedRequest as signedBody, type Signer } from '#tests/helpers/ed25519';
import { VALID_TOKEN } from '#tests/helpers/fixtures';

import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { HttpEdgeConfig } from '#interfaces/Config';
import type { Engine } from '#src/engine';
import type { InteractionKind } from '@seedcord/core';
import type { StoredSubscriberCtor } from '@seedcord/core/internal';
import type { TypedOmit } from '@seedcord/types';

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

export function signedRequest(signer: Signer, payload: unknown): Promise<Request> {
    return signedBody(signer, JSON.stringify(payload));
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

interface ReadyEngine extends Disposable {
    readonly signer: Signer;
    readonly handle: Engine;
}

// a fresh edge Seedcord per call, loading the classes from a fresh file table
export async function readyEngine(classes: BotClasses, options: EngineOptions = {}): Promise<ReadyEngine> {
    const signer = await createSigner();
    Envapter.useSource(new PortableSource({ ...options.env, DISCORD_BOT_TOKEN: VALID_TOKEN }));
    const bakedIds = registerBakedIds({ publicKey: signer.publicKeyHex });
    const builtFiles = registerBuiltFiles(filesOf(classes), Object.values(FOLDERS));

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
    return {
        signer,
        handle: (request, ctx) => seedcord.fetch(request, undefined, ctx),
        [Symbol.dispose]: () => {
            builtFiles[Symbol.dispose]();
            bakedIds[Symbol.dispose]();
        }
    };
}

export { capturingCtx, slashPayload } from '#tests/helpers/interactions';
