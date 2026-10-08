import path from 'node:path';

import { InteractionKind } from '@seedcord/core';
import { describe, expect, it } from 'vitest';

import { InteractionDispatcher } from '#src/dispatch/InteractionDispatcher';

const HANDLERS_DIR = path.resolve(__dirname, './fixtures/handlers');
const MIDDLEWARES_DIR = path.resolve(__dirname, './fixtures/middlewares');

async function readyDispatcher(middlewaresDir?: string): Promise<InteractionDispatcher> {
    const dispatcher = new InteractionDispatcher(HANDLERS_DIR, middlewaresDir);
    await dispatcher.init();
    return dispatcher;
}

function names(chain: readonly { name: string }[]): string[] {
    return chain.map((ctor) => ctor.name);
}

describe('http middleware discovery', () => {
    it('registers a decorated middleware from the middlewares directory', async () => {
        const dispatcher = await readyDispatcher(MIDDLEWARES_DIR);

        expect(names(dispatcher.middlewares.chainFor(InteractionKind.Slash))).toEqual(['Audit']);
    });

    it('keeps a kind-scoped middleware out of the chains it omits', async () => {
        const dispatcher = await readyDispatcher(MIDDLEWARES_DIR);

        expect(names(dispatcher.middlewares.chainFor(InteractionKind.Button))).toEqual(['Audit', 'ButtonAudit']);
        expect(names(dispatcher.middlewares.chainFor(InteractionKind.Modal))).toEqual(['Audit']);
    });

    it('drops a middleware from every chain when its file goes away', async () => {
        const dispatcher = await readyDispatcher(MIDDLEWARES_DIR);

        await dispatcher.onHmr({ type: 'delete', file: path.join(MIDDLEWARES_DIR, 'Audit.ts') });

        expect(names(dispatcher.middlewares.chainFor(InteractionKind.Button))).toEqual(['ButtonAudit']);
    });

    it('leaves the chains empty without a middlewares directory', async () => {
        const dispatcher = await readyDispatcher();

        expect(dispatcher.middlewares.chainFor(InteractionKind.Slash)).toEqual([]);
    });
});
