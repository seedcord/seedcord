import { beforeEach, describe, expect, it, vi } from 'vitest';

import { capturingCtx, emptyManifest, readyEngine, signedRequest } from './harness';
import { ConfirmButton, NoteModal, NoteModalId } from '../discovery/fixtures/handlers/ConfirmControls';

import type { RouteManifest } from '#src/manifest/RouteManifest';

const rest = vi.hoisted(() => {
    class FakeRest {
        public post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });
        public patch = vi.fn().mockResolvedValue({ id: 'm-1' });

        public setToken(): this {
            return this;
        }
    }
    return { FakeRest };
});

// the factory must not import project modules, vitest loads factory imports in a mock-bypass
// context that would cache the engine graph unmocked
vi.mock('@discordjs/rest', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    REST: rest.FakeRest
}));

const FIXTURE = 'tests/node/discovery/fixtures/handlers/ConfirmControls.ts';
const loadFixture = (): Promise<Record<string, unknown>> => import('../discovery/fixtures/handlers/ConfirmControls');

beforeEach(() => {
    vi.restoreAllMocks();
});

function modalSubmit(): object {
    return {
        type: 5,
        id: 'int-1',
        application_id: 'app-1',
        token: 'tok',
        app_permissions: '0',
        data: { custom_id: NoteModalId.encode({ subject: 'release' }), components: [] }
    };
}

function modalRow(exportName: string): RouteManifest['componentRoutes'][number] {
    return { kind: 'modal', prefix: 'discoverynote', exportName, from: FIXTURE, load: loadFixture };
}

describe('a manifest row states the export it loads', () => {
    it('constructs the named export when its module carries a second handler class', async () => {
        const noteExecute = vi.spyOn(NoteModal.prototype, 'execute');
        const confirmExecute = vi.spyOn(ConfirmButton.prototype, 'execute');
        const { signer, handle } = await readyEngine({
            ...emptyManifest(),
            componentRoutes: [modalRow('NoteModal')]
        });
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, modalSubmit()), ctx);
        await ctx.settled();

        expect(noteExecute).toHaveBeenCalledTimes(1);
        expect(confirmExecute).not.toHaveBeenCalled();
    });

    it('runs no handler when the module does not export the name the row gives', async () => {
        const noteExecute = vi.spyOn(NoteModal.prototype, 'execute');
        const { signer, handle } = await readyEngine({
            ...emptyManifest(),
            componentRoutes: [modalRow('RenamedModal')]
        });
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, modalSubmit()), ctx);

        expect(response.status).toBe(202);
        expect(noteExecute).not.toHaveBeenCalled();
        expect(ctx.waitUntil).not.toHaveBeenCalled();
    });
});
